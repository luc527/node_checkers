import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import 'dotenv/config'

import * as Users from './users.js';
import * as Friends from './friends.js';
import NotificationQueues from './notificationQueues.js';
import * as jwt from './jwt.js'

const notificationQueues = new NotificationQueues();

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
            const {id, name} = await jwt.verify(token, process.env.JWT_SECRET);
            req.user = {id, name};
            res.locals.loggedUserName = name;  // for use in templates
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
        const token = await jwt.sign({
            id: user.id,
            name: user.name
        }, process.env.JWT_SECRET);
        res.cookie('token', token);
        res.status(200).end();
    }
});

app.get('/exit', (req, res) => {
    res.clearCookie('token');
    res.render('login', {title: 'Login'});
});

//
// Endpoints below need authorization
//

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.status(403);
        // TODO test
        if (req.is('json')) {
            res.json({message: 'Unauthorized'});
        } else {
            res.render('unauthorized', {title: 'Unauthorized'})
        }
    }
});

app.get('/', (req, res) => {
    res.render('index', {title: 'Home'});
});

app.get('/users', async (req, res) => {
    const perPage = 15;

    const search = req.query.search || '';
    const page   = req.query.page   || 1;
    const offset = (page - 1) * perPage;

    let users = [];
    let errorMessage = '';

    try {
        users = await Users.search(req.user.id, search, perPage, offset);
    } catch (error) {
        errorMessage = error;
    }

    const options = {
        title: 'Search users',
        loggedUser: req.user.id,
        users,
        errorMessage,
        search,
        page,
        showPrev: users && page > 1,
        showNext: users && users.length == perPage,
    };
    res.render('user-search', options);
});

app.get('/friendRequests', async (req, res) => {
    let friendRequestsSent     = [];
    let friendRequestsReceived = [];
    let errorMessage           = '';

    try {
        const requests = await Friends.requests(req.user.id);
        friendRequestsSent     = requests.filter(r => r.from_id == req.user.id);
        friendRequestsReceived = requests.filter(r => r.to_id   == req.user.id);
    } catch (error) {
        errorMessage = error;
    }

    res.render('friend-requests', {
        title: 'Friend requests',
        friendRequestsSent,
        friendRequestsReceived,
        errorMessage,
        tab: req.query.tab ?? 'received'
    });
})

app.post('/friendRequests', async (req, res) => {
    const from = Number(req.user.id);
    const to   = Number(req.body.id);

    if (!Number.isInteger(from) || !Number.isInteger(to)) {
        res.status(400).json({message: 'Invalid user IDs'});
    }
    if (from == to) {
        res.status(400).json({message: 'Cannot send friend request to yourself'});
    }

    try {
        await Friends.sendRequest(from, to);
        const {name} = await Users.findById(from);
        notificationQueues.enqueue(to, {
            message: `${name} wants to be your friend!`,
            link: '/friendRequests?tab=received',
        });
        res.status(200).end();
    } catch (error) {
        res.status(400).json({message: error.toString()});
    }
});

app.delete('/friendRequests', async (req, res) => {
    const fromId = Number(req.query.from);
    const toId   = Number(req.query.to);

    const cancelling = req.user.id == fromId;
    const accepting  = req.user.id == toId && req.query.action == 'accept';
    const rejecting  = req.user.id == toId && req.query.action == 'reject';

    try {
        if (cancelling) {
            await Friends.cancelRequest(fromId, toId);
        }
        else if (accepting) {
            await Friends.acceptRequest(fromId, toId);
            const {name} = await Users.findById(toId);
            notificationQueues.enqueue(fromId, {
                message: `${name} accepted your friend request!`,
                link: '/friends'
            });
        }
        else if (rejecting) {
            await Friends.rejectRequest(fromId, toId);
            const {name} = await Users.findById(toId);
            notificationQueues.enqueue(fromId, {
                message: `${name} rejected your friend request...`,
            });
        }
        else {
            res.status(400).json({message: 'Invalid action'});
        }
        res.status(200).end();
    } catch (error) {
        res.status(400).json({message: error.toString()});
    }
});

app.get('/friends', async (req, res) => {
    const page    = Number(req.query.page || 1);
    const perPage = 15;
    const offset  = (page - 1) * perPage;

    let friends        = [];
    let errorMessage = '';

    try {
        friends = await Friends.ofUser(req.user.id, perPage, offset);
    } catch(error) {
        errorMessage = error.toString();
    }

    res.render('friends', {
        title: 'Friends',
        errorMessage,
        friends,
        page,
        showPrev: friends && page > 1,
        showNext: friends && friends.length == perPage,
    });
});

app.delete('/friends', async (req, res) => {
    const id = Number(req.query.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({message: 'Invalid user ID'});
    }
    try {
        await Friends.remove(req.user.id, id);
        res.status(200).end();
    } catch (error) {
        res.status(400).json({message: error.toString()});
    }
});

app.get('/notifications', (req, res) => {
    res.header('Cache-Control', 'no-cache');
    res.status(200).json(notificationQueues.consume(req.user.id));
});

app.get('/play/ai', (req, res) => {
    res.render('ai-form', {title: 'Play against an AI'});
});

app.get('/play/human', (req, res) => {
    res.status(200).send('TODO');
});

app.get('/play', (req, res) => {
    res.header('Cache-Control', 'no-cache');
    res.render('play', {title: 'Play against an AI'});
});

//
// Start server
//

const port = process.env.WEB_PORT || 80;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});