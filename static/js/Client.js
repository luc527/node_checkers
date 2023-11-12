// TODO module
class Client {

    constructor(url, verbose=false) {
        this.url         = url;
        this.ws          = null;
        this.queue       = [];
        this.verbose     = verbose;
        this.listeners   = {};
        this.lastVersion = 0;

        this.gameType      = null;
        this.gameId        = null;
        this.myColor       = null;
        this.myToken       = null;
        this.opponentToken = null;

        this.connect();
    }

    on(type, listener) {
        this.listeners[type] ||= [];
        this.listeners[type].push(listener);
        return this;
    }

    send(type, data) {
        const message = {type, data};
        if (this.verbose) console.log('sending', message)
        const json    = JSON.stringify(message);
        if (this.ws?.readyState == WebSocket.OPEN) {
            this.ws.send(json);
        } else {
            this.queue.push(json);
        }
        return this;
    }

    connect() {
        const url = this.url;
        const ws  = new WebSocket(url);

        ws.onopen = ev => {
            if (this.verbose) console.log('websocket open', ev);
            this.ws = ws;
            while (this.queue.length > 0) {
                ws.send(this.queue.shift());
            }
            if (this.gameId) {
                // TODO reconnect to the game
            }
        };

        ws.onerror = ev => {
            if (this.verbose) console.log('websocket error', ev);
            this.ws = null;
            setTimeout(() => {
                this.connect();
            }, 2000);
        };

        ws.onmessage = ev => {
            if (this.verbose) console.log('websocket message', ev);
            const message = JSON.parse(ev.data);

            if (message.type == 'state') {
                this.lastVersion = message.version;
                message.plies = message.plies.map(parsePly);
                message.board = parseBoard(message.board);
            }

            const machConnected  = message.type == 'mach/connected';
            const humanCreated   = message.type == 'human/created';
            const humanConnected = message.type == 'human/connected';

            if (machConnected || humanConnected || humanCreated) {
                this.gameId  = message.id;
                this.myColor = message.yourColor;
                if (humanConnected || humanCreated) {
                    this.myToken = message.yourToken;
                    if (humanCreated) {
                        this.opponentToken = message.opponentToken;
                    }
                }
            }

            if (this.listeneners.hasOwnProperty(message.type)) {
                for (const listener of this.listeners[message.type]) {
                    listener(message);
                }
            }
        };

        ws.onclose = ev => {
            if (this.verbose) console.log('websocket close', ev);
        };
    }

    createMachineGame(myColor='white', heuristic='WeightedCount', timeLimitMs=1000) {
        this.gameType = 'mach/new';
        this.send('mach/new', {
            humanColor: myColor,
            heuristic,
            timeLimitMs,
        });
        return this;
    }

    connectToMachineGame(id) {
        this.gameType = 'mach/connect';
        this.send('mach/connect', {id});
        return this;
    }

    createHumanGame(color='white') {
        this.gameType = 'human/new';
        this.send('human/new', {color});
        return this;
    }

    doPly(index) {
        this.send('ply', { version: this.lastVersion, index });
    }
}

function parseInstruction(i) {
    const errPrefix = `invalid instruction ${i}: `;

    if (i.length < 3) {
        throw new Error(errPrefix + 'too short')
    }

    const [typeCh, rowCh, colCh, ...rest] = i.split('')
    const row = rowCh - '0';
    const col = colCh - '0';

    if (!inBounds(row, col)) {
        throw new Error(errPrefix + 'out of bounds');
    }

    switch (typeCh) {
    case 'm':
        if (rest.length != 2) {
            throw new Error(errPrefix + 'too short for move instruction');
        }
        const [drowCh, dcolCh] = rest;
        const drow = drowCh - '0';
        const dcol = dcolCh - '0';
        if (!inBounds(drow, dcol)) {
            throw new Error(errPrefix + 'out of bounds');
        }
        return {type: 'move', row, col, drow, dcol};

    case 'c':
        if (rest.length != 2) {
            throw new Error(errPrefix + 'too short for capture instruction');
        }
        const [colorCh, kindCh] = rest;
        return {
            type: 'capture',
            row,
            col,
            color: parseColor(colorCh),
            kind: parseKind(kindCh),
        };

    case 'k':
        return {type: 'capture', row, col};

    default:
        throw new Error(errPrefix + `unknown type ${typeCh}`);
    }
}

function parseColor(c) {
    if (c == 'w') {
        return 'white';
    } else if (c == 'b') {
        return 'black';
    } else {
        throw new Error(`parse color: unknown color char ${c}`)
    }
}

function parseKind(c) {
    if (c == 'k') {
        return 'king';
    } else if (c == 'p') {
        return 'pawn';
    } else {
        throw new Error(`parse kind: unknown kind char ${c}`)
    }
}

function parsePly(s) {
    return s.split(',').map(parseInstruction);
}

function inBounds(row, col) {
    return row >= 0 && row <= 7 && col >= 0 && col <= 7;
}

function* chunks(s, n) {
    for (let i = 0; i < s.length; i += n) {
        yield s.slice(i, i + n);
    }
}

function parseBoard(s) {
    if (s.length % 4 != 0) {
        throw new Error('invalid board');
    }

    const board = Array(8).fill(null);
    for (let i = 0; i < 8; i++) {
        board[i] = Array(8).fill(null);
    }

    for (const piece of chunks(s, 4)) {
        const [rowCh, colCh, colorCh, kindCh] = piece.split('');

        const row = rowCh - '0';
        const col = colCh - '0';
        if (!inBounds(row, col)) {
            throw new Error(`invalid board (piece ${piece}): out of bounds`);
        }

        board[row][col] = {
            color: parseColor(colorCh),
            kind: parseKind(kindCh),
        };
    }

    return board;
}
