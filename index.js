import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import 'dotenv/config'

import * as usr from './users.js';
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
            const {id} = await jwt.verify(token, process.env.JWT_SECRET);
            req.user = id;
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
    const {ok, error} = await usr.signUp(username, password);
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
    const {ok, error, user} = await usr.login(username, password);
    if (!ok) {
        res.status(400).json({message: error});
    } else {
        const token = await jwt.sign({id: user.id}, process.env.JWT_SECRET);
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

app.get('/', (req, res) => {
    res.render('index', {title: 'Home'});
});

app.get('/users', async (req, res) => {
    const perPage = 20;

    const search = req.query.search;
    const page   = req.query.page ?? 1;
    const offset = (page - 1) * perPage;

    let users = [];
    let errorMessage = '';

    try {
        users = await usr.search(search, perPage, offset);
    } catch (error) {
        errorMessage = error;
    }

    // TODO url encode search?

    res.render('user-search', {
        title: 'Search users',
        users,
        errorMessage,
        search,
        showPrev: users && page > 1,
        showNext: users && users.length == perPage,
    });
});

//
// Start server
//

const port = process.env.WEB_PORT || 80;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});