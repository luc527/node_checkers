export function mergeBy(a, b, f) {
    let ai = 0;
    let bi = 0;

    const m = [];
    while (ai < a.length && bi < b.length) {
        const less = f(a[ai], b[bi]);
        if (less) m.push(a[ai++]);
        else      m.push(b[bi++]);
    }
    while (ai < a.length) m.push(a[ai++]);
    while (bi < b.length) m.push(b[bi++]);

    return m;
}