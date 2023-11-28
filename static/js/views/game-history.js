document.addEventListener('DOMContentLoaded', () => {
    const plyHistory = rawPlyHistory.map((state, index) => ({
        pieces: parsePieces(state.board),
        plyDone: state.plyDone && parsePly(state.plyDone),
        toPlay: (index % 2 == 0) ? 'white' : 'black',
    }));

    const stateElements = [];
    for (const state of plyHistory) {
        const canvas = document.createElement('canvas');
        canvas.style.width = 'max(250px, 15vw)';

        const boardView = new BoardView(canvas);
        boardView.draw(state.pieces);

        if (state.plyDone) {
            const moves = state.plyDone.filter(ins => ins.type == 'move');
            const toHighlight = [
                {row: moves[0].row, col: moves[0].col},
                ...moves.map(mov => ({row: mov.drow, col: mov.dcol})),
            ];
            toHighlight.forEach(pos => boardView.highlight(pos));
        }

        // TODO also describe ply done, and show whose turn it is

        const stateElement = elt('div', [], canvas);
        stateElements.push(stateElement);
    }

    const container = document.querySelector('#states-container');
    container.append(...stateElements);
});