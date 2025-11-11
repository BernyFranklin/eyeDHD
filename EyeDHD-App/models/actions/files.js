import createCsvTable from "../tables/csv";
import csv from "./csv";

export default { create, read, update, remove };

// Creates a new file record and loads its CSV data into the database
function create(db, filename, filepath, bufferSize) {
    const result = db.prepare(`
        INSERT INTO files (name, path, bufferSize)
        VALUES (?, ?, ?);
    `).run(filename, filepath, bufferSize);

    const file = db.prepare(`
        SELECT * FROM files WHERE id = ?;
    `).get(result.lastInsertRowId);

    if (!file || file.name !== filename || file.path !== filepath) {
        return { ok: false, file: undefined };
    }

    createCsvTable(db, file.name);

    return { ok: true, document: file };
}

// Reads a file record by filename
function read(db, filename) {
    const file = db.prepare(`
        SELECT * FROM files WHERE name = ?;
    `).get(filename);

    if (!file) {
        return { ok: false, file: undefined };
    }

    return { ok: true, file };
}

// Updates a file record by filename
function update(db, filename, ...rest) {
    return { ok: true, file: undefined };
}

// Removes a file record by filename
function remove(db, filename) {
	return { ok: true, file: undefined };
}