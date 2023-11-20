const WS_URL = 'ws://localhost:88/ws'

const PLIES_RGB = [
];

const ONE_BY_ONE_RGB = [];

let boardView;
let client;

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
            pliesGrouped.clear();
            for (const ply of plies) {
                const source = ply.find(ins => ins.type == 'move');
                pliesGrouped.set(poshash(source), plies);
                boardView.highlight(source);
            }
        }
    });

    client.on('error', error => {
        errorToast(error.message);
    });

    boardView.onClick((row, col) => {
        // TODO switch (viewState)
        const plies = pliesGrouped.get(poshash(row, col));
        if (!plies) {
            return;
        }
        const overlap = false;
        // to detect overlap consider only drow and dcol of each move instruction
        if (overlap || plies.length > PLY_COLORS.length) {
            // show one by one with scroll
        } else {
            // show all of them at the same time
            // each starting at each ply color
        }
        // in both cases, the initial colors should be bright and then should go gradually darker to indicate the order of the positions
    });

    const params = new URL(location).searchParams;

    switch (params.get('mode')) {
    case 'ai':
        const heuristic = params.get('heuristic');
        const timeLimit = Number(params.get('timeLimit'));
        const color     = params.get('color');
        const id        = params.get('id');
        if (heuristic && timeLimit) {
            client.on('machine/connected', msg => {
                client.id = msg.id;
            });
            client.createMachineGame(color, heuristic, timeLimit);
        } else if (id) {

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

