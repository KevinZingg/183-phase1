const db = require('./fw/db');
const { promisify } = require('util');

async function getHtml(req) {
    let html = '';
    let taskId = '';

    if (req.body.id && req.body.id.length !== 0) {
        taskId = req.body.id;
        const query = promisify(db.executeStatement).bind(db);
        let stmt = await query('SELECT ID, title, state FROM tasks WHERE ID = ?', [taskId]);
        if (stmt.length === 0) {
            taskId = '';
        }
    }

    if (req.body.title && req.body.state) {
        let state = req.body.state;
        let title = req.body.title;
        let userid = req.cookies.userid;

        const query = promisify(db.executeStatement).bind(db);

        try {
            if (taskId === '') {
                await query("INSERT INTO tasks (title, state, userID) VALUES (?, ?, ?)", [title, state, userid]);
            } else {
                await query("UPDATE tasks SET title = ?, state = ? WHERE ID = ?", [title, state, taskId]);
            }
            html += "<span class='info info-success'>Update successful</span>";
        } catch (error) {
            console.error('Database error:', error);
            html += "<span class='info info-error'>Update failed</span>";
        }
    } else {
        html += "<span class='info info-error'>No update was made</span>";
    }

    return html;
}

module.exports = { html: getHtml }
