const WS_URL = 'ws://localhost:88/ws'

const PLIES_RGB = [
    [255, 0, 0],    //red
    [0, 255, 0],    //green
    [0, 0, 255],    //blue
    [255, 255, 0],  //yellow
];

const ONE_BY_ONE_RGB = [255, 0, 255];  //magenta

// FIXME sending ply might fail, but we go to the 'waitingOpponentPly' state anyways

let boardView;
let viewState;
let client;
let selectedSource;

let currentPlies;
let plyIndexesGrouped = new Map();

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
            client.on('human/created', message => sendPlayInvite(message, opponentId))
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

function waitPlySelection() {
    viewState = 'waitingPlySelection';

    let overlap = false;
    const destinationSet      = new Set()
    const destinationsGrouped = [];

    const plyIndexes = plyIndexesGrouped.get(poshash(selectedSource));
    for (const plyIndex of plyIndexes) {
        const ply = currentPlies[plyIndex];
        const plyDestinations = [];
        for (const instruction of ply) {
            if (instruction.type != 'move') {
                continue;
            }
            const destination = {
                row: instruction.drow,
                col: instruction.dcol,
            };
            const hash = poshash(destination);
            if (destinationSet.has(hash)) {
                overlap = true;
            }
            destinationSet.add(hash);
            plyDestinations.push(destination);
        }
        destinationsGrouped.push(plyDestinations);
    }

    boardView.clearHighlight();
    if (overlap || plyIndexes.length > PLIES_RGB.length) {
        infoToast('TODO scroll mode');
    } else {
        for (let i = 0; i < destinationsGrouped.length; i++) {
            const plyDestinations = destinationsGrouped[i];
            let rgb = PLIES_RGB[i];
            for (const {row, col} of plyDestinations) {
                boardView.highlight({row, col}, rgb)
                rgb = darken(rgb);
            }
        }
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
    let selectedPlyIndex = null;
    const plyIndexes = plyIndexesGrouped.get(poshash(selectedSource));
    for (const plyIndex of plyIndexes) {
        const ply = currentPlies[plyIndex];
        if (ply.some(ins => ins.type == 'move' && ins.drow == row && ins.dcol == col)) {
            selectedPlyIndex = plyIndex;
            break;
        }
    }

    if (selectedPlyIndex === null) {
        waitSourceSelection();
    } else {
        client.doPly(selectedPlyIndex);
        waitOpponentPly();
    }
}

function darken([r, g, b]) {
    return [
        Math.max(0, r-30),
        Math.max(0, g-30),
        Math.max(0, b-30),
    ]
}

async function sendPlayInvite(createdMessage, opponentId) {
    const {id, opponentToken: token} = createdMessage;
    const {ok} = await request('POST', `/users/${opponentId}/gameInvites`, { id, token });
    if (!ok) {
        errorToast('Failed to invite opponent');
    } else {
        console.info('Opponent invited successfully');
    }
}