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

        this.#connect();
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

    #reconnect() {
        setTimeout(() => {
            this.#connect();
        }, 2000);
    }

    // TODO remove
    reconnect(){this.#reconnect()}

    #connect() {
        const url = this.url;
        const ws  = new WebSocket(url);

        ws.onopen = ev => {
            if (this.verbose) console.log('websocket open', ev);
            this.ws = ws;
            while (this.queue.length > 0) {
                ws.send(this.queue.shift());
            }
            if (this.gameId) {
                if (this.gameType == 'mach') {
                    this.connectToMachineGame(this.gameId);
                } else {
                    this.connectToHumanGame(this.gameId, this.myToken);
                }
            }
        };

        ws.onerror = ev => {
            if (this.verbose) console.log('websocket error', ev);
            this.ws = null;
            this.#reconnect();
        };

        ws.onmessage = ev => {
            if (this.verbose) console.log('websocket message', ev);
            const message = JSON.parse(ev.data);

            if (message.type == 'state') {
                this.lastVersion = message.version;
                message.plies    = message.plies.map(parsePly);
                message.pieces   = parsePieces(message.board);
                delete message.board;
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

            if (this.listeners.hasOwnProperty(message.type)) {
                for (const listener of this.listeners[message.type]) {
                    listener(message);
                }
            }
        };

        ws.onclose = ev => {
            if (this.verbose) console.log('websocket close', ev);
            if (ev.code != 1000 && ev.code != 1005) {
                this.#reconnect();
            }
        };
    }

    createMachineGame(myColor='white', heuristic='WeightedCount', timeLimitMs=1000) {
        this.gameType = 'mach';
        this.send('mach/new', {
            humanColor: myColor,
            heuristic,
            timeLimitMs,
        });
        return this;
    }

    connectToMachineGame(id) {
        this.gameType = 'mach';
        this.send('mach/connect', {id});
        return this;
    }

    createHumanGame(color='white') {
        this.gameType = 'human';
        this.send('human/new', {color});
        return this;
    }

    connectToHumanGame(id, token) {
        this.gameType = 'human';
        this.send('human/connect', {id, token});
        return this;
    }

    doPly(ply) {
        this.send('ply', { version: this.lastVersion, ply });
        return this;
    }
}

