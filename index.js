import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import 'dotenv/config'

import Users from './users.js';
import * as jwt from './jwt.js'

const app = express();

app.use(morgan('dev'));
app.use('/static', express.static('static'));

app.use(cookieParser());
app.use(bodyParser.json());

app.set('view engine', 'pug');
app.set('views', './views');

app.use(async (req, res, next) => {
    const token = req.cookies.token;
    if (typeof token === 'string') {
        try {
            const {user} = await jwt.verify(token, process.env.JWT_SECRET);
            req.user = user;
        } catch (ignored) {}
    }
    next();
});

//
// Signup
//

app.get('/signup', (req, res) => {
    res.render('signup', {title: 'Sign up'});
});

app.post('/signup', async (req, res) => {
    const {username, password} = req.body;
    const {ok, error} = await Users.signUp(username, password);
    if (ok) {
        res.status(200).end();
    } else {
        res.status(400).json({message: error});
    }
});

//
// Login
//

app.get('/login', (req, res) => {
    res.render('login', {title: 'Login'});
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const {ok, error, user} = await Users.login(username, password);
    if (!ok) {
        res.status(400).json({message: error});
    } else {
        delete user.password_hash;
        const token = await jwt.sign({user}, process.env.JWT_SECRET);
        res.cookie('token', token);
        res.status(200).end();
    }
});

//
// Endpoints below need authorization
//

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.status(403).json({message: 'Unauthorized'});
    }
});

app.get('/me', (req, res) => {
    console.log('me');
    res.json(req.user);
});

//
// Start server
//

const port = process.env.WEB_PORT || 80;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});