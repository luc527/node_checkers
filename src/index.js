import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import 'dotenv/config'

import * as Users from './users.js';
import * as Friends from './friends.js';
import * as Games from './games.js';
import NotificationQueues from './notificationQueues.js';
import * as jwt from './jwt.js'
import {mergeBy} from './util.js'
import { fetchGameHistory } from './wsIntegration.js';

const notificationQueues = new NotificationQueues();

const app = express();

// TODO instead of doing if errorMessage on the template
// make a separate template that contains just an error message
// and render it conditionally

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
            res.locals.loggedUserId = name;
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
// Webhook
//

app.post('/games/webhook', async (req, res) => {
    // TODO: authorization
    const {mode, id, result, timestamp} = req.body;
    if (!['human', 'machine'].includes(mode)) {
        res.status(406).send('Invalid mode');
        return;
    }
    if (!['playing', 'white won', 'black won', 'draw'].includes(result)) {
        res.status(406).send('Invalid result');
        return;
    }
    const date = new Date(timestamp);
    try {
        await Games.updateGame(mode, id, result, date);
        res.status(200).end();
    } catch (error) {
        console.error('webhook failed:', error);
        res.status(500).send('Failed to update game status');
    }
});

//
// Endpoints below need authorization
//

app.use((req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.status(403);
        if (req.is('json')) {
            res.json({message: 'Unauthorized'});
        } else {
            res.render('unauthorized', {title: 'Unauthorized'})
        }
    }
});

app.get('/', async (req, res) => {
    const [machineGames, humanGames] = await Promise.all([
        Games.findMachineGames(req.user.id, 1, 10).then(games => games.map(game => ({
            mode: 'ai',
            id: game.game_uuid,
            startedAt: new Date(game.started_at),
            endedAt: game.ended_at ? new Date(game.ended_at) : null,
            result: game.game_result,
            playLink: `/play?mode=ai&id=${game.game_uuid}`,
            viewLink: `/games/ai/${game.game_uuid}`,
            info: `Heuristic: ${game.heuristic}, time limit: ${game.time_limit_ms/1000}s`
        }))),
        Games.findHumanGames(req.user.id, 1, 10).then(games => games.map(game => ({
            mode: 'human',
            id: game.game_uuid,
            startedAt: new Date(game.started_at),
            endedAt: game.ended_at ? new Date(game.endede_at) : null,
            result: game.game_result,
            info: `Against ${req.user.id == game.white_id ? game.black_name : game.white_name}`,
            playLink: `play?mode=human&id=${game.game_uuid}&token=${req.user.id == game.white_id ? game.white_token : game.black_token}`,
            viewLink: `/games/human/${game.game_uuid}`,
        }))),
    ]);
 
    const games = mergeBy(
        machineGames,
        humanGames,
        (a, b) => a.startedAt > b.startedAt,
    ).slice(0, 10);

    res.render('index', {
        title: 'Home',
        games,
    });
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
        perPage,
    };
    res.render('user-search', options);
});

app.post('/users/:id/gameInvites', (req, res) => {
    // regex validation with :id(\d+) didn't work
    const toId = Number(req.params.id);
    if (!Number.isInteger(toId)) {
        res.status(400).json({message: 'Invalid user ID'});
    }
    const {id, token} = req.body;
    notificationQueues.enqueue(toId,
        `${req.user.name} invites you to play!`,
        `/play?mode=human&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
    );
});

app.get('/users/checkName', async (req, res) => {
    const {name} = req.query;
    try {
        const user = await Users.findByName(name)
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({message: 'User not found'});
        }
    } catch (error) {
        res.status(500).json({message: 'Internal server error'});
    }
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
        notificationQueues.enqueue(to,
            `${name} wants to be your friend!`,
            '/friendRequests?tab=received'
        );
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
            notificationQueues.enqueue(fromId,
                `${name} accepted your friend request!`,
                '/friends'
            );
        }
        else if (rejecting) {
            await Friends.rejectRequest(fromId, toId);
            const {name} = await Users.findById(toId);
            notificationQueues.enqueue(fromId, `${name} rejected your friend request...`);
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
        perPage,
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
    res.render('human-form', {
        title: 'Play against someone',
        opponent: req.query.opponent,
    });
});

app.get('/play', (req, res) => {
    res.header('Cache-Control', 'no-cache');
    res.render('play', {title: 'Play'});
});

app.get('/games/ai/:uuid', async (req, res) => {
    const uuid = req.params.uuid;
    const game = await Games.findMachineGame(uuid);
    if (game == null) {
        // TODO render error template
        res.status(400).end();
        return;
    }
    const history = await fetchGameHistory('machine', uuid);
    res.render('game-history', {
        title: 'Game history',
        mode: 'ai',
        game,
        history,
    });
});

app.get('/games/human/:uuid', async (req, res) => {
    const uuid = req.params.uuid;
    const game = await Games.findHumanGame(uuid);
    if (game == null) {
        // TODO render error template
        res.status(400).end();
        return;
    }
    const history = await fetchGameHistory('human', uuid);
    res.render('game-history', {
        title: 'Game history',
        mode: 'human',
        game,
        history,
    });
});

app.get('/games/ai', async (req, res) => {
    const page    = Number(req.query.page || '1');
    const perPage = 15;
    const games = [];
    for (const game of await Games.findEndedMachineGames(req.user.id, page, perPage)) {
        games.push({
            id: game.game_uuid,
            startedAt: new Date(game.started_at),
            endedAt: new Date(game.ended_at),
            result: game.game_result,
            yourColor: game.player_color,
            heuristic: game.heuristic,
            timeLimit: (game.time_limit_ms / 1000) + 's',
        });
    }
    const options = {
        title: 'Previous games',
        games,
        page,
        perPage,
    };
    res.render('machine-games', options);
});

app.get('/games/human', async (req, res) => {
    const page    = Number(req.query.page || '1');
    const perPage = 15;
    const games = [];
    for (const game of await Games.findEndedHumanGames(req.user.id, page, perPage)) {
        const userWhite = game.white_id == req.user.id;
        const userColor = userWhite ? 'white' : 'black';
        const opponentName = userWhite ? game.black_name : game.white_name;
        games.push({
            id: game.game_uuid,
            startedAt: new Date(game.started_at),
            endedAt: new Date(game.ended_at),
            result: game.game_result,
            yourColor: userColor,
            opponentName,
        });
    }
    const options = {
        title: 'Previous games',
        games,
        page,
        perPage,
    };
    res.render('human-games', options);
});

app.post('/games/ai', async (req, res) => {
    const {id, color, heuristic, timeLimit} = req.body;
    try {
        await Games.saveMachineGame(id, req.user.id, color, heuristic, timeLimit);
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(400).json({message: error.toString()});
    }
});

app.post('/games/human', async (req, res) => {
    const {id, color, opponent, myToken, opponentToken} = req.body;
    const amWhite = color == 'white';

    const whiteToken = amWhite ? myToken : opponentToken;
    const blackToken = amWhite ? opponentToken : myToken;
    const whiteId    = amWhite ? req.user.id : opponent;
    const blackId    = amWhite ? opponent : req.user.id;
     
    try {
        await Games.saveHumanGame(id, whiteId, blackId, whiteToken, blackToken);
        res.status(201).send();
    } catch (error) {
        console.error(error);
        res.status(400).json({message: error.toString()});
    }
});

//
// Start server
//

const port = process.env.WEB_PORT || 80;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});