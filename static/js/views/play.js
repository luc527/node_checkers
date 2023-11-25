const WS_URL = 'ws://localhost:88/ws'

const PLIES_RGB = [
    [255, 0, 0],    //red
    [0, 255, 0],    //green
    [0, 0, 255],    //blue
    [255, 255, 0],  //yellow
];

const SCROLL_RGB = [255, 0, 255];  //magenta

// FIXME sending ply might fail, but we go to the 'waitingOpponentPly' state anyways

let boardView;
let viewState;
let client;
let selectedSource;

let currentPlies;
let plyIndexesGrouped = new Map();

let scrollMode = false;
let scrollIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    //
    // Setup objects
    //

    const canvas = document.querySelector('.board-canvas');

    boardView = new BoardView(canvas);

    const verbose = true;
    client = new Client(WS_URL, verbose);

    //
    // Setup listeners
    //

    client.on('state', state => {
        const {plies, pieces, toPlay, result} = state;
        currentPlies = plies;

        boardView.draw(pieces);

        if (result != 'playing') {
            viewState = 'over';
            infoToast(`Game over: ${result}`);
            return;
        }

        if (toPlay == client.myColor) {
            viewState = 'waitingSourceSelection';
            plyIndexesGrouped.clear();
            for (let i = 0; i < currentPlies.length; i++) {
                const hash = poshash(plies[i].find(ins => ins.type == 'move'));
                let sameSourceIndexes = plyIndexesGrouped.get(hash);
                if (!sameSourceIndexes) {
                    sameSourceIndexes = [];
                    plyIndexesGrouped.set(hash, sameSourceIndexes);
                }
                sameSourceIndexes.push(i);
            }

            const sources = Array.from(plyIndexesGrouped.keys()).map(posrecv);
            sources.forEach(pos => boardView.highlight(pos));
        }
    });

    client.on('error', error => {
        errorToast(error.message);
    });

    client.on('terminated', () => {
        viewState = 'over';
    });

    // TODO on <esc> undo ply selection

    boardView.onClick((row, col) => {
        switch (viewState) {
        case 'waitingOpponentPly':
        case 'over':
            // Do nothing
            break;
        case 'waitingSourceSelection':
            selectSource(row, col);
            break;
        case 'waitingPlySelection':
            selectPly(row, col);
            break;
        default:
            errorToast('invalid or unimplemeted view state');
        }
    });

    document.addEventListener('keydown', ev => {
        if (ev.key == 'Escape' && viewState == 'waitingPlySelection') {
            waitSourceSelection();
        }
    });

    document.addEventListener('wheel', ev => {
        if (viewState != 'waitingPlySelection' || !scrollMode) {
            return;
        }

        const plyIndexes = plyIndexesGrouped.get(poshash(selectedSource));

        const offset = ev.wheelDelta > 0 ? 1 : -1;
        scrollIndex += offset;
        if (scrollIndex < 0)                     scrollIndex = plyIndexes.length - 1;
        if (scrollIndex > plyIndexes.length - 1) scrollIndex = 0;

        drawPlyScrollMode(currentPlies[scrollIndex]);
    });

    //
    // Create or connect to game
    //

    const params = new URL(location).searchParams;

    switch (params.get('mode')) {
    case 'ai': {
        const heuristic = params.get('heuristic');
        const timeLimit = Number(params.get('timeLimit'));
        const color     = params.get('color');
        const id        = params.get('id');
        if (heuristic && timeLimit) {
            client.createMachineGame(color, heuristic, timeLimit);
            client.on('mach/connected', message => {
                saveCreatedMachineGame(message.id, message.yourColor, heuristic, timeLimit);
            });
        } else if (id) {
            client.connectToMachineGame(id);
        } else {
            errorToast(`Missing parameters for machine game`);
        }
    }
    break;
    case 'human': {
        const opponentId = decodeURIComponent(params.get('opponentId'));
        const color      = params.get('color');
        const gameId     = decodeURIComponent(params.get('id'));
        const token      = decodeURIComponent(params.get('token'));

        if (opponentId && color) {
            client.on('human/created', message => {
                sendPlayInvite(message, opponentId);
                const {yourToken: myToken, opponentToken} = message;
                saveCreatedHumanGame(message.id, message.yourColor, opponentId, myToken, opponentToken)
            });
            client.createHumanGame(color);
        } else if (gameId && token) {
            client.connectToHumanGame(gameId, token);
        } else {
            errorToast(`Missing parameters for game against human`);
        }
    }
    break;
    default:
        errorToast(`Invalid mode "${params.get('mode')}"`);
        break;
    }
});

function waitSourceSelection() {
    viewState = 'waitingSourceSelection';
    boardView.clearHighlight();
    for (const sourceHash of plyIndexesGrouped.keys()) {
        const source = posrecv(sourceHash);
        boardView.highlight(source);
    }
}

function plyDestinations(ply) {
    const destinations = [];
    for (const instruction of ply) {
        if (instruction.type != 'move') {
            continue;
        }
        const destination = {
            row: instruction.drow,
            col: instruction.dcol,
        };
        destinations.push(destination);
    }
    return destinations;
}

function hasOverlap(destinationsGrouped) {
    const positionSet = new Set();
    for (const destinations of destinationsGrouped) {
        for (const destination of destinations) {
            const hash = poshash(destination);
            if (positionSet.has(hash)) {
                return true;
            }
            positionSet.add(hash);
        }
    }
    return false;
}

function waitPlySelection() {
    viewState = 'waitingPlySelection';

    const plyIndexes          = plyIndexesGrouped.get(poshash(selectedSource));
    const destinationsGrouped = plyIndexes.map(i => plyDestinations(currentPlies[i]));

    console.log({destinationsGrouped});

    scrollMode = hasOverlap(destinationsGrouped) || plyIndexes.length > PLIES_RGB.length;

    boardView.clearHighlight();
    if (scrollMode) {
        scrollIndex = 0;
        drawPlyScrollMode()
    } else {
        for (let i = 0; i < destinationsGrouped.length; i++) {
            const rgb = PLIES_RGB[i];
            const destinations = destinationsGrouped[i];
            drawDestinationSequence(rgb, destinations);
        }
    }
}

function drawDestinationSequence(rgb, destinations) {
    for (const {row, col} of destinations) {
        boardView.highlight({row, col}, rgb)
        rgb = darken(rgb);
    }
}

function waitOpponentPly() {
    boardView.clearHighlight();
    viewState = 'waitingOpponentPly';
}

function selectSource(row, col) {
    if (!plyIndexesGrouped.has(poshash(row, col))) {
        return;
    }

    selectedSource = {row, col};
    waitPlySelection();
}

function selectPly(row, col) {
    const plyIndexes = plyIndexesGrouped.get(poshash(selectedSource));

    let selectedPlyIndex = null;
    if (scrollMode) {
        const plyIndex = plyIndexes[scrollIndex];
        const ply      = currentPlies[plyIndex];
        if (ply.some(ins => ins.type == 'move' && ins.drow == row && ins.dcol == col)) {
            selectedPlyIndex = plyIndex;
        }
    } else {
        for (const plyIndex of plyIndexes) {
            const ply = currentPlies[plyIndex];
            if (ply.some(ins => ins.type == 'move' && ins.drow == row && ins.dcol == col)) {
                selectedPlyIndex = plyIndex;
                break;
            }
        }
    }

    if (selectedPlyIndex === null) {
        waitSourceSelection();
    } else {
        client.doPly(selectedPlyIndex);
        waitOpponentPly();
    }
}

function drawPlyScrollMode() {
    const plyIndexes   = plyIndexesGrouped.get(poshash(selectedSource));
    const destinations = plyDestinations(currentPlies[plyIndexes[scrollIndex]]);
    boardView.clearHighlight();
    drawDestinationSequence(SCROLL_RGB, destinations);
}

function darken([r, g, b]) {
    return [
        Math.max(0, r-45),
        Math.max(0, g-45),
        Math.max(0, b-45),
    ]
}

async function sendPlayInvite(createdMessage, opponentId) {
    const {id, opponentToken: token} = createdMessage;
    const {ok, body} = await request('POST', `/users/${opponentId}/gameInvites`, { id, token });
    if (!ok) {
        errorToast('Failed to invite opponent: ', body.message);
    } else {
        console.info('Opponent invited successfully');
    }
}

async function saveCreatedMachineGame(gameId, color, heuristic, timeLimit) {
    const {ok, body} = await request('POST', `/games/ai/`, {
        id: gameId,
        color,
        heuristic,
        timeLimit,
    });
    if (!ok) {
        errorToast('Failed to save created machine game: ', body.message);
    } else {
        console.info('Machine game saved successfully');
    }
}

async function saveCreatedHumanGame(gameId, myColor, opponentId, myToken, opponentToken) {
    const {ok, body} = await request('POST', `/games/human/`, {
        id: gameId,
        color: myColor,
        opponent: opponentId,
        myToken,
        opponentToken,
    });
    if (!ok) {
        errorToast('Failed to save created machine game: ', body.message);
    } else {
        console.info('Machine game saved successfully');
    }
}