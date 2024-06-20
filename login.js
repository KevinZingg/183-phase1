const db = require('./fw/db');
const rateLimit = require('express-rate-limit');

// Rate limiter middleware
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

async function handleLogin(req, res) {
    let msg = '';
    let user = { 'username': '', 'userid': 0 };

    if (typeof req.query.username !== 'undefined' && typeof req.query.password !== 'undefined') {
        // Get username and password from the form and call the validateLogin
        let result = await validateLogin(req.query.username, req.query.password);

        if (result.valid) {
            // Login is correct. Store user information to be returned.
            user.username = req.query.username;
            user.userid = result.userId;
            msg = result.msg;
        } else {
            msg = result.msg;
        }
    }

    return { 'html': msg + getHtml(), 'user': user };
}

function startUserSession(res, user) {
    console.log('login valid... start user session now for userid ' + user.userid);
    res.cookie('username', user.username);
    res.cookie('userid', user.userid);
    res.redirect('/');
}

async function validateLogin(username, password) {
    let result = { valid: false, msg: '', userId: 0 };

    // Connect to the database
    const dbConnection = await db.connectDB();

    const sql = `SELECT id, username, password, failed_attempts, lock_until FROM users WHERE username='` + username + `'`;
    try {
        const [results, fields] = await dbConnection.query(sql);

        if (results.length > 0) {
            // Bind the result variables
            let db_id = results[0].id;
            let db_username = results[0].username;
            let db_password = results[0].password;
            let failed_attempts = results[0].failed_attempts;
            let lock_until = results[0].lock_until;

            // Check if the account is locked
            if (lock_until && lock_until > Date.now()) {
                result.msg = 'Your account is locked due to too many failed login attempts. Please try again after 1 minute.';
                return result;
            }

            // Verify the password
            if (password == db_password) {
                result.userId = db_id;
                result.valid = true;
                result.msg = 'Login correct';
                // Reset failed attempts on successful login
                await dbConnection.query(`UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ` + db_id);
            } else {
                // Password is incorrect
                failed_attempts += 1;
                let lockUntil = null;

                if (failed_attempts >= 5) {
                    lockUntil = Date.now() + 1 * 60 * 1000; // Lock account for 1 minute
                    result.msg = 'Your account is locked due to too many failed login attempts. Please try again after 1 minute.';
                } else {
                    result.msg = 'Incorrect password';
                }

                await dbConnection.query(`UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?`, [failed_attempts, lockUntil, db_id]);
            }
        } else {
            // Username does not exist
            result.msg = 'Username does not exist';
        }

        console.log(results); // results contains rows returned by server
        // console.log(fields); // fields contains extra meta data about results, if available
    } catch (err) {
        console.log(err);
    }

    return result;
}

function getHtml() {
    return `
    <h2>Login</h2>

    <form id="form" method="get" action="/login">
        <div class="form-group">
            <label for="username">Username</label>
            <input type="text" class="form-control size-medium" name="username" id="username">
        </div>
        <div class="form-group">
            <label for="password">Password</label>
            <input type="text" class="form-control size-medium" name="password" id="password">
        </div>
        <div class="form-group">
            <label for="submit" ></label>
            <input id="submit" type="submit" class="btn size-auto" value="Login" />
        </div>
    </form>`;
}

function getLockoutHtml() {
    return `
    <h2>Account Locked</h2>
    <p>Your account has been locked due to too many failed login attempts. Please try again after 1 minute.</p>
    `;
}

module.exports = {
    handleLogin: handleLogin,
    startUserSession: startUserSession,
    loginLimiter: loginLimiter,
    getLockoutHtml: getLockoutHtml
};
