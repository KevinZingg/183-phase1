require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const csrf = require('csurf');
const header = require('./fw/header');
const footer = require('./fw/footer');
const login = require('./login'); // Assuming this exports loginLimiter, handleLogin, and getLockoutHtml
const index = require('./index');
const adminUser = require('./admin/users');
const editTask = require('./edit');
const saveTask = require('./savetask');
const search = require('./search');
const searchProvider = require('./search/v2/index');

const app = express();
const PORT = 3000;

// Use Helmet to secure HTTP headers
app.use(helmet());

// Middleware for session handling
app.use(session({
    secret: process.env.SESSION_SECRET, // Use environment variable for secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true } // Secure cookies
}));

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
app.use(cookieParser());
app.use(csrfProtection);

// Middleware for body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await index.html(req), req);
        res.send(html);
    } else {
        res.redirect('login');
    }
});

app.post('/', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await index.html(req), req);
        res.send(html);
    } else {
        res.redirect('login');
    }
});

// Admin users
app.get('/admin/users', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await adminUser.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// Edit task
app.get('/edit', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await editTask.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// Login page
app.get('/login', login.loginLimiter, async (req, res) => {
    let content = await login.handleLogin(req, res);

    if (content.user.userid !== 0) {
        // login was successful... set cookies and redirect to /
        login.startUserSession(res, content.user);
    } else {
        // login unsuccessful or not made yet... display login form
        let html = await wrapContent(content.html, req);
        res.send(html);
    }
});

// Lockout page
app.get('/lockout', (req, res) => {
    let html = login.getLockoutHtml();
    res.send(html);
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('username');
        res.clearCookie('userid');
        res.redirect('/login');
    });
});

// Profile page
app.get('/profile', (req, res) => {
    if (req.session.loggedin) {
        res.send(`Welcome, ${req.session.username}! <a href="/logout">Logout</a>`);
    } else {
        res.send('Please login to view this page');
    }
});

// Save task
app.post('/savetask', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await saveTask.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// Search
app.post('/search', async (req, res) => {
    let html = await search.html(req);
    res.send(html);
});

// Search provider
app.get('/search/v2/', async (req, res) => {
    let result = await searchProvider.search(req);
    res.send(result);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

async function wrapContent(content, req) {
    let headerHtml = await header(req);
    return headerHtml + content + footer;
}

function activeUserSession(req) {
    // Check if session is active
    console.log('in activeUserSession');
    console.log(req.session);
    return req.session.loggedin;
}
