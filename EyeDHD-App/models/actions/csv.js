import files from './files';

export default { create, open, save, remove };

// Creates new cleaned CSV rows in the database
function create(db, filename, rows) {
    try {
        const result = db.prepare(`
            INSERT INTO ${filename} ()
            VALUES (?, ?, ?);
        `).run(filename, filepath, bufferSize);

        return { ok: true };
    } catch (err) {

    }
}

// Reads cleaned CSV rows from the database
function read(db, file) {
    try {
        const rows = db.prepare(`
            SELECT * FROM ${file.name}
            OFFSET ${file.rows_read} ROWS
            FETCH NEXT ${file.buffer_size} ROWS ONLY;
        `).all();

        // Update file metadata

        return { ok: false, rows };
    } catch (err) {
        console.error(`Failed to read cleaned rows for file: ${file.name}`, err);
        return { ok: false, rows: undefined };
    }
}