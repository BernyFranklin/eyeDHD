export default { create, open, save, remove };

function create(db, rows) {
    return { ok: true, rows: undefined };
}

function read(db, from) {
    return { ok: false, rows: undefined };
}