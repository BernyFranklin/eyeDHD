import createCsvTable from "../tables/csv";

export default { create, read, update, remove };

// Creates a new file record and loads its CSV data into the database
function create(db, filename, filepath, buffer_size) {
	try {
		db.prepare(`
			INSERT INTO files (name, path, buffer_size)
			VALUES (?, ?, ?);
		`).run(filename, filepath, buffer_size);

		return { ok: true };
	} catch (err) {
		console.error(`Failed to create file record for: ${filename}`, err);
		return { ok: false };
	}
}

// Reads a file record by filename
function read(db, filename) {
	try {
		const file = db.prepare(`
			SELECT * FROM files WHERE name = ?;
		`).get(filename);

		if (!file) {
			return { ok: false, file: undefined };
		}

		return { ok: true, file };
	} catch (err) {
		console.error(`Failed to read file record for: ${filename}`, err);
		return { ok: false, file: undefined };
	}
}

// Updates a file record by filename
function update(db, filename, ...rest) {
	try {

		return { ok: true };
	} catch (err) {
		console.error(`Failed to update file record for: ${filename}`, err);
		return { ok: false };
	}
}

// Removes a file record by filename
function remove(db, filename) {
	try {

		return { ok: true };
	} catch (err) {
		console.error(`Failed to remove file record for: ${filename}`, err);
		return { ok: false };
	}
}