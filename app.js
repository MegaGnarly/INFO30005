// Set server port and import required modules
const PORT = 3000;
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const exphbs = require('express-handlebars');
const passport = require('./passport')

// Load database schemas
const measuredValue = require('./models/measuredValue');
const clinicalNote = require('./models/clinicalNote');
const patient = require('./models/patient')
require('./models')

const flash = require('express-flash')
const session = require('express-session')

// link to our routers
const appRouter = require('./routes/appRouter')                 // Handle general routes (e.g. about_site)
const patientRouter = require('./routes/patientRouter')         // Handle patient routes (e.g. record_health)
const clinicianRouter = require('./routes/clinicianRouter.js')  // Handle clinician routes (e.g. clinician_dashboard)


// Routing - set site routes
app.use('/', appRouter)
app.use('/patient', patientRouter)
app.use('/clinician_dashboard', clinicianRouter)

// Configure handlebars
app.engine('hbs', exphbs.engine({
    defaultlayout: 'main',
    extname: 'hbs'
}))

// Set handlebars view engine
app.set('view engine', 'hbs')

// Flash messages for failed logins, and (possibly) other success/error messages
app.use(flash())

// Track authenticated users through login sessions
app.use(
    session({
        // The secret used to sign session cookies (ADD ENV VAR)
        secret: process.env.SESSION_SECRET || 'keyboard cat',
        name: 'demo', // The cookie name (CHANGE THIS)
        saveUninitialized: false,
        resave: false,
        cookie: {
            sameSite: 'strict',
            httpOnly: true,
            secure: app.get('env') === 'production',
            maxAge: 600000
        },
    })
)
if (app.get('env') === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
}

// Initialise Passport.js
app.use(passport.authenticate('session'))

// Load authentication router
const authRouter = require('./routes/authRouter');
app.use(authRouter)

const isAuthenticated = (req, res, next) => {
    // If user is not authenticated via passport, redirect to login page
    if (!req.isAuthenticated()) {
        return res.redirect('/login_page')
    }
    // Otherwise, proceed to next middleware function
    return next()
}

// Define where static assets live
app.use(express.static('public'))

// Used to expose body section for POST method
app.use(bodyParser.urlencoded({ extended: false }));

// Debugging middleware that prints when a request arrives at the server 
app.use((req, res, next) => {
    console.log('Message arrived: ' + req.method + ' ' + req.path)
    next()
})


// **** Application GETs ****  
// app.get('/patient_history', isAuthenticated, (req, res) => {
//     res.render('patient_history.hbs', { logoURL: "../patient_dashboard", user: req.user.toJSON() })
// })

app.get('/thankyou_page', (req, res) => {
    res.render('thankyou_page.hbs', { user: req.user.toJSON(), logoURL: "../patient_dashboard" })
})

// app.get('/leaderboard', (req, res) => {
//     console.log("IN LEADERBOARD")
//     res.render('leaderboard.hbs', { user: req.user.toJSON(), logoURL: "../patient_dashboard" })
// })

// **** Application POSTs ****  
app.post('/post_values', async (req, res) => {
    const valid_measurements = ["measured_glucose", "measured_weight", "measured_insulin", "measured_exercise"];
    const measuredType = req.body.Selector
    const valueIsEmpty = !req.body.measurement;

    // Check if the value recieved is a valid meaurement type and that it is not empty.
    if ((valid_measurements.includes(measuredType)) && (!valueIsEmpty)) {
        try {
            // New code that constructs and entry that will be inserted into the database.
            // Note that all measured values are blank for now.
            const doc = {
                username: req.user.username,
                date: new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Melbourne' }),
                time: new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute:'2-digit' }),
                measured_glucose: "-",
                measured_weight: "-",
                measured_insulin: "-",
                measured_exercise: "-",
                comment: req.body.comment
            }

            // Determine what type of data the user has inserted and update the above entry accordingly.
            if (measuredType == "measured_glucose") {
                doc.measured_glucose = req.body.measurement;
            }
            else if (measuredType == "measured_weight") {
                doc.measured_weight = req.body.measurement;
            }
            else if (measuredType == "measured_insulin") {
                doc.measured_insulin = req.body.measurement;
            }
            else if (measuredType == "measured_exercise") {
                doc.measured_exercise = req.body.measurement;
            }

            //Insert the final entry into the database and redirect user.
            measuredValue.collection.insertOne(doc);

            console.log("DEBUG: Ran insertion")
            await res.redirect('thankyou_page')
        } catch (error) {
            console.log(error);
            return res.render('error_page', { buttonURL: "/login_page", buttonText: "Login Page", errorHeading: "An error occurred", errorText: "An error occurred when performing your request. This may occur if you are not logged in.", logoURL: "../patient_dashboard" })
        }

    } else {
        console.log("POST ERROR: Health value from client is not acceptable (either invalid measurement type or empty string). Value will not be inserted into db.")
        return res.render('error_page', { buttonURL: req.header('Referer'), buttonText: "Go Back", errorHeading: "An error occurred when recording your data. Please try again!", errorText: "Please ensure that you have selected the correct measurement type and that you are entering acceptable values.", logoURL: "../patient_dashboard" })
    }
})


// User registration. We can keep this code on app.js
const User = require('./models/user');
app.post('/register', (req, res) => {
    if (req.body.password != req.body.password2) { return; }
    User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.fname,
        lastName: req.body.lname,
        dateSince: Date.now(),
        secret: 'INFO30005',
        // Set permissions and default values for safety thresholds - these can be modified by the clinician
        threshold_bg: { prescribed: false, lower: 4.0, upper: 7.8 },
        threshold_weight: { prescribed: false, lower: 50, upper: 90 },
        threshold_exercise: { prescribed: false, lower: 5000, upper: 8000 },
        threshold_insulin: { prescribed: false, lower: 0, upper: 10 },

        // Set default support message from clinician
        support_msg: "Welcome to Diabetes@Home! Messages from your clinician will appear here 😊"

    }, (err) => {
        if (err) { console.log(err); return; }
        console.log('User inserted')
    })
    res.render('login_page', { layout: 'main2' })
})

// Patient changes password in settings. MOVE TO ROUTER
app.post('/change_pwd', async (req, res) => {
    console.log("Debug: inside change pwd")
    // Verify user input (make sure passwords match)
    console.log(req.body.password)

    // Update database

    // Return


})


// **** Handlebars Helpers ****
// Clinician Dashboard helper - red outline on user if they violate a safety threshold
var hbs = exphbs.create({});
hbs.handlebars.registerHelper('thresholdChecker', function (num, options) {
    if (num < 4.0 || num > 7.8) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// Used to make the index in leaderboard start from 1 instead of 0
hbs.handlebars.registerHelper('inc', function(value, options)
{
    return parseInt(value) + 1;
});

// **** Main code that launches the server ****  
app.listen(process.env.PORT || PORT, () => {
    console.log('\n\nDiabetes@Home is running! CTRL + Click the URL below to open a browser window. Press CTRL + C to shut down the server.')
    console.log('http://127.0.0.1:' + PORT + '/login_page' + '\n')
    console.log('Visit the clinician dashboard on:')
    console.log('http://127.0.0.1:' + PORT + '/clinician_dashboard/' + '\n')
})
