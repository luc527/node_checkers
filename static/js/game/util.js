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

function parsePieces(s) {
    if (s.length % 4 != 0) {
        throw new Error('invalid board');
    }

    const pieces = [];

    for (const piece of chunks(s, 4)) {
        const [rowCh, colCh, colorCh, kindCh] = piece.split('');

        const row = rowCh - '0';
        const col = colCh - '0';
        if (!inBounds(row, col)) {
            throw new Error(`invalid board (piece ${piece}): out of bounds`);
        }

        pieces.push({
            color: parseColor(colorCh),
            kind: parseKind(kindCh),
            row, col,
        });
    }

    return pieces;
}

function poshash(a, b) {
    return b === undefined
        ? a.row*8 + a.col
        : a*8 + b;
}

function posrecv(h) {
    return {
        row: Math.trunc(h / 8),
        col: h % 8,
    };
}