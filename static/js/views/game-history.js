document.addEventListener('DOMContentLoaded', () => {

    const states = rawPlyHistory.map((state, index) => ({
        pieces: parsePieces(state.board),
        plyDone: state.plyDone && parsePly(state.plyDone),
        toPlay: (index % 2 == 0) ? 'white' : 'black',
    }));

    const stateTemplate = document.querySelector('#state-template').content.firstElementChild;

    const stateElements = states.map(state => {
        const elem = stateTemplate.cloneNode(true);

        if (state.plyDone) {
            elem.querySelector('.ply-description').innerHTML = plyDescriptionHtml(state);
        }

        const canvas = elem.querySelector('canvas');
        canvas.style.borderRadius = '0.375rem';
        
        const view = new BoardView(canvas);
        view.draw(state.pieces);
        if (state.plyDone) {
            const moves = state.plyDone.filter(ins => ins.type == 'move');
            const source = {
                row: moves[0].row,
                col: moves[0].col,
            };
            const destinations = moves.map(mov => ({
                row: mov.drow,
                col: mov.dcol,
            }));
            view.highlight(source);
            for (const d of destinations) {
                view.highlight(d);
            }
        }

        return elem;
    });

    const container = document.querySelector('#states-container');
    container.append(...stateElements);
});

function posString({ row, col }) {
    return `(${row}, ${col})`;
}

function plyDescriptionHtml(state) {
    const ply = state.plyDone;
    const pieces = state.pieces;

    const squares = [];
    const captures = [];
    let crown = false;

    for (const ins of ply) {
        if (ins.type == 'move') {
            if (squares.length == 0) {
                squares.push({
                    row: ins.row,
                    col: ins.col,
                });
            }
            squares.push({
                row: ins.drow,
                col: ins.col,
            });
        } else if (ins.type == 'capture') {
            captures.push(ins);
        }
    }

    const source      = squares.at(0);
    const destination = squares.at(-1);
    const through     = squares.length > 2
        ? squares.splice(1, squares.length-2)
        : [];

    const {
        kind: movedKind,
        color: movedColor,
    } = pieces.find(piece => piece.row == source.row && piece.col == source.col);
    const moved = movedColor + ' ' + movedKind;

    const segments = [];

    segments.push(`Moved <b>${moved}</b> from <b>${posString(source)}</b> to <b>${posString(destination)}</b>`);
    if (through.length > 0) {
        segments.push(` through ${through.map(posString).map(s => `<b>${s}</b>`).join(', ')}`);
    }
    if (captures.length > 0) {
        segments.push(`, capturing <b>${captures.length}</b> piece${captures.length > 1 ? 's' : ''}`);
    }

    return segments.join('');
}