import createCsvTable from "../tables/csv";

export default { create, read, update, remove };

// Creates a new file record and loads its CSV data into the database
function create(db, filename, filepath, buffer_size) {
    try {
        db.prepare(`
            INSERT INTO files (name, path, buffer_size)
            VALUES (?, ?, ?);
        `).run(filename, filepath, buffer_size);

        createCsvTable(db, filename);

        return { ok: true };
    } catch (err) {
        console.error(`Failed to create file record for: ${filename}`, err);
        return { ok: false };
    }
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