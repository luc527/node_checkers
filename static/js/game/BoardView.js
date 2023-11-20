class BoardView {

    static SIDE = 1024;
    static SQUARE_SIDE = BoardView.SIDE / 8;

    static WHITE_SQUARE_COLOR = '#ebecd0';
    static BLACK_SQUARE_COLOR = '#779556';

    /**
     * @param {HTMLCanvasElement} canvas 
     */
    constructor(canvas) {
        canvas.width = BoardView.SIDE;
        canvas.height = BoardView.SIDE;

        this.canvas = canvas;
        this.context = canvas.getContext('2d', {alpha: false});
        this.highlighted = new Set();
        this.clickCallbacks = [];

        this.lastPieces = null;

        this.canvas.addEventListener('click', ev => {
            const rect = this.canvas.getBoundingClientRect();
            const col = Math.trunc((ev.clientX - rect.x) / (rect.width / 8));
            const row = Math.trunc((ev.clientY - rect.y) / (rect.height / 8));
            for (const callback of this.clickCallbacks) {
                callback(row, col);
            }
        });

        this.draw([]);
    }

    #drawSquares() {
        const ctx = this.context;
        const squareSide = BoardView.SQUARE_SIDE;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const y = squareSide * row;
                const x = squareSide * col;
                const white = (row + col) % 2 == 0;
                ctx.fillStyle = white
                    ? BoardView.WHITE_SQUARE_COLOR
                    : BoardView.BLACK_SQUARE_COLOR;
                ctx.fillRect(x, y, squareSide, squareSide);
            }
        }
    }

    #kingPath(ctx, x, y, r) {
        ctx.arc(x, y+10, r, 0, Math.PI, false);

        ctx.lineTo(x-r+5, y-r-5);
        ctx.lineTo(x-r/2+5, y-r+15);
        ctx.lineTo(x, y-r);
        ctx.lineTo(x+r/2-5, y-r+15);
        ctx.lineTo(x+r-5, y-r-5);

        ctx.lineTo(x+r, y+10);
    }

    #drawPawn(x, y, radius, white) {
        const ctx = this.context;

        ctx.fillStyle = white ? '#eee' : '#444';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2*Math.PI);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = white ? '#333' : '#000';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2*Math.PI);
        ctx.stroke();
    }

    #drawKing(x, y, r, white) {
        const ctx = this.context;

        ctx.fillStyle = white ? '#eee' : '#444';
        ctx.beginPath();
        this.#kingPath(ctx, x, y, r);
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = white ? '#333' : '#000';

        ctx.beginPath();
        this.#kingPath(ctx, x, y, r);
        ctx.stroke();

        ctx.beginPath()
        ctx.moveTo(x-r, y-10);
        ctx.lineTo(x+r, y-10)
        ctx.stroke();
    }

    #drawPieces(pieces) {
        const squareSide = BoardView.SQUARE_SIDE;
        const radius = (squareSide >> 1) - 20;

        for (const {color, kind, row, col} of pieces) {
            const white = color == 'white';
            const king  = kind  == 'king';

            const y = squareSide * row + (squareSide >> 1);
            const x = squareSide * col + (squareSide >> 1);
            // TODO show pawns and kings differently

            if (king) {
                this.#drawKing(x, y, radius, white);
            } else {
                this.#drawPawn(x, y, radius, white);
            }
        }
    }

    draw(pieces) {
        this.lastPieces = pieces;
        this.#drawSquares();
        this.#drawPieces(pieces);
        this.highlighted.clear();
    }

    clearHighlight() {
        this.draw(this.lastPieces ?? []);
    }

    highlight({row, col}, rgb=[255, 2550, 0]) {
        if (this.highlighted.has(poshash(row, col))) {
            return;
        }

        const ctx = this.context;
        const side = BoardView.SQUARE_SIDE;

        const [r, g, b] = rgb;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;

        const x = side * col;
        const y = side * row;
        ctx.fillRect(x, y, side, side);
        this.highlighted.add(poshash(row, col));
    }

    onClick(cb) {
        this.clickCallbacks.push(cb);
    }
}
