require('dotenv').config();

const express = require('express');
const sqlite = require('sqlite3');
const { format } = require('date-fns');
const fs = require('fs');
const crypto = require('crypto');

const db = new sqlite.Database(process.env.DB ?? 'sqlite.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        perms INTEGER NOT NULL,
        klasse TEXT NOT NULL,
        stufe INTEGER NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sessions(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
        token TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS wahlen(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        desc TEXT NOT NULL,
        min INTEGER NOT NULL,
        max INTEGER NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS votes(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        erstwahl TEXT NOT NULL,
        zweitwahl TEXT NOT NULL
    )`);
});

const app = express();
app.use(require('cookie-parser')());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded());

/*
Public
*/
app.post('/accept-cookies', (req, res) => {
    if (req.body.cookies && req.body.datenschutz) {
        res.cookie('cookies', 'True', {
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.statusCode = 302;
        res.setHeader('Location', '/');
        res.end();
    } else {
        res.send('Nicht allem zugestimmt. Aus Sicherheitsgründen dürfen wir Sie nicht weiter lassen.')
    }
});

/*
Check for Cookies
*/
app.use((req, res, next) => {
    const publicUrls = [
        '/impressum.html',
        '/datenschutz.html',
        '/cookies.html'
    ]
    if (publicUrls.includes(req.url) || req.url.startsWith('/img/') || req.url.endsWith('.css') || req.url.endsWith('js')) {
        next();
    } else if (req.cookies.cookies == 'True') {
        next();
    } else {
        res.status(403).redirect('/cookies.html')
        res.end();
        return;
    }
});

app.get('/logout', (req, res) => {
    db.run('DELETE FROM sessions WHERE token = ?', [req.cookies.sess_id], (err) => {
        if (err) {
            res.status(503).send(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
            res.end();
            return;
        } else {
            res.clearCookie('notarobot');
            res.clearCookie('sess_id');
            res.statusCode = 302;
            res.setHeader('Location', '/impressum.html');
            res.end();
        }
    });
});

app.get('/notarobot', (req, res) => {
    const id = crypto.randomInt(1, 7);
    res.sendFile(`C:/Users/Sabine/Desktop/WahlTool/frontend/notarobot/${id}.png`);
    res.cookie('notarobot', id);
});

app.get('/', (req, res) => {
    res.sendFile('C:/Users/Sabine/Desktop/WahlTool/frontend/index.html');
});

app.post('/login', (req, res) => {
    const notarobot = [
        'Ytxy5',
        'a768X',
        'dwE9',
        '4356y',
        'gfegu',
        '7654f',
        'zfuivs'
    ]
    const username = req.body.username;
    const password = req.body.password;
    if (notarobot[req.cookies.notarobot - 1] == req.body.robot && req.body.username && req.body.password) {
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, userdata) => {
            if (err) {
                res.status(403).redirect('/#wrong')
                res.end();
            } else if (userdata && userdata.username == username && userdata.password == password) {
                try {
                    db.get(`SELECT * FROM sessions WHERE username = ?`, [username], (err, data) => {
                        if (err) {
                            res.status(403).redirect('/#wrong')
                            res.end();
                        } else if (!data || data.token == null) {
                            const uuid = crypto.randomUUID();
                            db.run(`INSERT INTO sessions(token, username) VALUES(?,?)`, [uuid, username], (err) => {
                                if (err) {
                                    res.status(403).redirect('/#wrong')
                                    res.end();
                                } else {
                                    res.cookie('sess_id', uuid, { maxAge: 3600000, sameSite: 'lax' });
                                    res.statusCode = 302;
                                    res.setHeader('Location', '/home');
                                    res.end();
                                }
                            });
                        } else {
                            const uuid = crypto.randomUUID()
                            db.run(`UPDATE sessions SET token = ? WHERE username = ?`, [uuid, username], (err) => {
                                if (err) {
                                    res.status(403).redirect('/#wrong')
                                    res.end();
                                    return;
                                }
                            });
                            res.cookie('sess_id', uuid, { maxAge: 3600000, sameSite: 'lax' });
                            res.statusCode = 302;
                            res.setHeader('Location', '/home');
                            res.end();
                        }
                    });
                } catch {
                    res.status(403).redirect('/#wrong')
                    res.end();
                }
            } else {
                res.status(403).redirect('/#wrong')
                res.end();
            }
        });
    } else {
        res.status(403).redirect('/#wrong')
        res.end();
    }
});

/*
Check for Session-Token
*/
app.use((req, res, next) => {
    const publicUrls = [
        '/impressum.html',
        '/datenschutz.html',
        '/cookies.html'
    ]
    if (publicUrls.includes(req.url) || req.url.startsWith('/img/') || req.url.endsWith('.css') || req.url.endsWith('js')) {
        next();
    } else if (req.cookies.cookies == 'True' && req.cookies.sess_id) {
        db.get(`SELECT * FROM sessions WHERE token = ?`, [req.cookies.sess_id], (err, sess_data) => {
            if (err) {
                res.status(403).redirect('/#block')
                res.end();
            } else if (sess_data && sess_data.token == req.cookies.sess_id) {
                next();
            } else {
                res.status(403).redirect('/#block')
                res.end();
            }
        });
    } else {
        res.status(403).redirect('/#block')
        res.end();
        return;
    }
});

app.get('/home', (req, res) => {
    res.sendFile('C:/Users/Sabine/Desktop/WahlTool/frontend/home.html');
});

app.get('/wahlen', (req, res) => {
    db.get(`SELECT * FROM sessions WHERE token = ?`, [req.cookies.sess_id], (err, sess_data) => {
        if (err) {
            res.status(500).end(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
        } else {
            db.get(`SELECT * FROM users WHERE username = ?`, [sess_data.username], (err, user_data) => {
                if (err) {
                    res.status(500).end(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
                } else {
                    db.all(`SELECT * FROM wahlen WHERE min <= ? AND max >= ?`, [user_data.stufe, user_data.stufe], (err, data) => {
                        if (err) {
                            res.status(500).end(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
                        } else {
                            res.send(data);
                            res.end();
                        }
                    })
                }
            });
        }
    });
});

app.post('/wahl', (req, res) => {
    if (req.body.erst && req.body.zweit) {
        db.get(`SELECT * FROM sessions WHERE token = ?`, [req.cookies.sess_id], (err, sess_data) => {
            if (err) {
                res.status(500).end(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
            } else {
                db.get(`SELECT * FROM users WHERE username = ?`, [sess_data.username], (err, user_data) => {
                    if (err) {
                        res.status(500).end(serverError('Fehler', 'Es gab wohl einen Fehler in der Datenbank.'))
                    } else {
                        db.get(`SELECT * FROM votes WHERE username = ?`, [user_data.username], (err, votes_data) => {
                            if (err) {
                                res.status(500).end('Fehler')
                            } else if (votes_data && votes_data.username) {
                                res.send(serverError('Bereits abgeschickt', 'Du hast schon gewählt.'));
                                res.end();
                            } else {
                                db.run(`INSERT INTO votes(username, erstwahl, zweitwahl) VALUES(?,?,?)`, [user_data.username, req.body.erst, req.body.zweit], (err) => {
                                    if (err) {
                                        res.status(400).end('Fehler. Versuche es später erneut.')
                                    } else {
                                        res.send(serverError('Erfolgreich', 'Du hast dich erfolgreich eingewählt.'));
                                        res.end();
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }
});

app.use(express.static('../frontend/public'));

require('http').createServer(app).listen(80);
// require('https').createServer({}, app).listen(80);

function serverError(title, msg) {
    return `
    <!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fehler</title>
    <link rel="stylesheet" href="index.css">
    <link rel="stylesheet" href="error.css">
    <script src="index.js" defer></script>
</head>

<body>
    <header>
        <img src="img/logo.png" class="logo">
        <h1>GRB-Wahlen</h1>
        <div></div>
    </header>

    <main>
        <h2>${title}</h2>
        <p>${msg}</p>
    </main>

    <footer>
        <div>
            <p>&copy;&nbsp;</p><a href="github.com/Barsch2006">Christian F.</a>&nbsp;<p>2023</p>
        </div>
        <div style="gap: 6px;">
            <a href="impressum.html">Impressum</a>
            <a href="datenschutz.html">Datenschutz</a>
        </div>
    </footer>
</body>

</html>
    `
}