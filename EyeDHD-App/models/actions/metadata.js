export default { create, read, update, remove };

/**
 * Creates a new file entry
 * @param {*} db
 * @param {*} filename
 * @param {*} filepath
 * @param {*} buffer_size
 * @returns object with ok boolean
 */
function create(db, filename, filepath, buffer_size) {
	try {
		db.prepare(`
			INSERT INTO metadata (name, path, buffer_size)
			VALUES (?, ?, ?);
		`).run(filename, filepath, buffer_size);

		return { ok: true };
	} catch (err) {
		console.error(`Failed to create file entry for: ${filename}`, err);
		return { ok: false };
	}
}

/**
 * Reads a file entry by filename
 * @param {*} db
 * @param {*} filename
 * @returns object with ok boolean and file entry
 */
function read(db, filename) {
	try {
		const file = db.prepare(`
			SELECT * FROM metadata WHERE name = ?;
		`).get(filename);

		if (!file) {
			return { ok: false, file: undefined };
		}

		return { ok: true, file };
	} catch (err) {
		console.error(`Failed to read file entry for: ${filename}`, err);
		return { ok: false, file: undefined };
	}
}

/**
 * Updates a file entry by filename
 *
 * Currently allows updating completed, cleaned, and requested.
 * Updated the updated_at timestamp automatically
 *
 * @param {*} db
 * @param {*} file
 * @returns object with ok boolean
 * Pass updates as:
 * ```js
 * const { file } = read(db, filename);
 * update(db, {
 *     ...file,
 *     cleaned: file.cleaned + 200
 * })
 * ```
 *
 * or update the file json directly and pass it in
 * ```js
 * let { file } = read(db, filename);
 * file.cleaned += 200;
 *
 * update(db, file)
 * ```
 */
function update(db, file) {
	try {
		const result = db.prepare(`
			UPDATE metadata
			SET
				completed = @completed,
				cleaned = @cleaned,
				requested = @requested,
				updated_at = CURRENT_TIMESTAMP
			WHERE name = @name;
		`).run(file);

		if (!result.changes) {
			return { ok: false };
		}

		return { ok: true };
	} catch (err) {
		console.error(`Failed to update file entry for: ${filename}`, err);
		return { ok: false };
	}
}

/**
 * Removes a file entry by filename
 * @param {*} db
 * @param {*} filename
 * @returns object with ok boolean and removed file entry
 */
function remove(db, filename) {
	try {
		// Read the entry to be removed to return to caller
		const { ok, file } = read(db, filename);

		const result = db.prepare(`
			DELETE FROM metadata
			WHERE name = ?
		`).run(filename);

		if (!result.changes || !ok) {
			return { ok: false, file: undefined };
		}

		return { ok: true, file };
	} catch (err) {
		console.error(`Failed to remove file entry for: ${filename}`, err);
		return { ok: false, file: undefined };
	}
}