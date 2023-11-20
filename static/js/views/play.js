const WS_URL = 'ws://localhost:88/ws'

const PLIES_RGB = [
    [255, 0, 0],    //red
    [0, 255, 0],    //green
    [0, 0, 255],    //blue
    [255, 255, 0],  //yellow
];

const ONE_BY_ONE_RGB = [255, 0, 255];  //magenta

let boardView;
let viewState;
let client;
let selectedSource;

let pliesGrouped = new Map();

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('.board-canvas');
    boardView = new BoardView(canvas);

    client = new Client(WS_URL, true);

    client.on('state', state => {
        const {plies, pieces, toPlay, result} = state;

        if (result == 'over') {
            infoToast('Game over');
            return;
        }

        boardView.draw(pieces);

        if (toPlay == client.myColor) {
            viewState = 'waitingSourceSelection';
            pliesGrouped.clear();
            for (const ply of plies) {
                const source = ply.find(ins => ins.type == 'move');
                boardView.highlight(source);

                const hash = poshash(source);

                let sameSourcePlies = pliesGrouped.get(hash);
                if (!sameSourcePlies) {
                    sameSourcePlies = [];
                    pliesGrouped.set(hash, sameSourcePlies);
                }
                sameSourcePlies.push(ply);

            }
        } else {
            viewState = 'waitingOpponentPly';
        }
    });

    client.on('error', error => {
        errorToast(error.message);
    });

    boardView.onClick((row, col) => {
        switch (viewState) {
        case 'waitingOpponentPly':
            break;
        case 'waitingSourceSelection':
            maybeSelectSource(row, col);
            break;
        case 'waitingPlySelection':
            maybeSelectPly(row, col);
            break;
        default:
            errorToast('invalid or unimplemeted view state');
        }
    });

    const params = new URL(location).searchParams;

    switch (params.get('mode')) {
    case 'ai':
        const heuristic = params.get('heuristic');
        const timeLimit = Number(params.get('timeLimit'));
        const color     = params.get('color');
        const id        = params.get('id');
        client.on('machine/connected', msg => {
            client.id = msg.id;
        });
        if (heuristic && timeLimit) {
            client.createMachineGame(color, heuristic, timeLimit);
        } else if (id) {
            client.connectToMachineGame(id);
        } else {
            errorToast(`Missing parameters for machine game`);
        }
        break;
    case 'human':
        break;
    default:
        errorToast(`Invalid mode "${params.get('mode')}"`);
        break;
    }
});

function maybeSelectSource(row, col) {
    const plies = pliesGrouped.get(poshash(row, col));
    if (!plies) {
        return;
    }

    selectedSource = {row, col};
    viewState = 'waitingPlySelection';

    boardView.redraw();
    const destinations = plies
        .map(ply => ply
            .filter(ins => ins.type == 'move')
            .map(ins => ({row: ins.drow, col: ins.dcol}))
        );
    const overlap = false;
    // to detect overlap consider only drow and dcol of each move instruction
    if (overlap || plies.length > PLIES_RGB.length) {
        // show one by one with scroll
    } else {
        for (let i = 0; i < destinations.length; i++) {
            let rgb = PLIES_RGB[i];
            for (const {row, col} of destinations[i]) {
                boardView.highlight({row, col}, rgb);
                rgb = darken(rgb);
            }
        }
    }
    // in both cases, the initial colors should be bright and then should go gradually darker to indicate the order of the positions
}

function maybeSelectPly(row, col) {
    // TODO Handle scroll mode
    let selectedPly;
    for (const ply of pliesGrouped.get(poshash(selectedSource))) {
        if (ply.some(ins => ins.drow == row && ins.dcol == col)) {
            selectedPly = ply;
            break;
        }
    }
    if (!selectedPly) {
        boardView.redraw();
        Array.from(pliesGrouped.keys())
            .map(posrecv)
            .forEach(pos => boardView.highlight(pos));
        viewState = 'waitingSourceSelection';
    } else {
        
    }
}

function darken([r, g, b]) {
    return [
        Math.max(0, r-30),
        Math.max(0, g-30),
        Math.max(0, b-30),
    ]
}