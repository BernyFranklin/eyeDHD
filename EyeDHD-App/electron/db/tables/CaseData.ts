import type { Database } from 'better-sqlite3';

export default { create, exists, read, iterate, update, remove };

export type CaseData = {
	id: number;
	name: string;
	path: string;
	header: string;
	completed: number;
	rows: number;
	created_at: string;
	updated_at: string;
};

/**
 * Creates the CaseData table in the database if it doesn't already exist. The CaseData
 * table stores information about each CSV file, including its name, path, header,
 * completion status, number of rows, and timestamps for creation and last update.
 */
export function createCaseDataTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS CaseData (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			header TEXT DEFAULT '',
			completed BOOLEAN DEFAULT 0,
			rows INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}

/**
 * Drops the CaseData table from the database. This is typically used for testing purposes
 * to reset the database state.
 */
export function deleteCaseDataTable(db: Database) {
	db.prepare(`
		DROP TABLE IF EXISTS CaseData;
	`)
	.run();
}

/**
 * Creates a new CaseData entry for a CSV file in the database. It takes the filename and
 * filepath as parameters, inserts a new row into the CaseData table, and returns the
 * created case data object. If the insertion fails, it throws an error.
 */
function create(
	db: Database,
	filename: string,
	filepath: string
): CaseData {
	const result = db.prepare<[string, string], CaseData>(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run(filename, filepath);

	const file = db.prepare<[number | bigint], CaseData>(`
			SELECT * FROM CaseData WHERE id = ?;
		`)
		.get(result.lastInsertRowid);

	if (!file) {
		throw new Error(`Failed to create file entry for: ${filename}`);
	}

	return file;
}

/**
 * Reads the case data for a given filename from the database. It queries the CaseData
 * table for a row matching the provided filename and returns the corresponding case
 * data object. If no matching entry is found, it throws an error.
 */
function read(db: Database, filename: string): CaseData {
	const file = db.prepare<string, CaseData>(`
		SELECT * FROM CaseData WHERE name = ?;
	`)
	.get(filename);

	if (!file) {
		throw new Error(`File entry not found for: ${filename}`);
	}

	return file;
}

/**
 * Checks if a case data entry exists for a given filename in the database. It queries the
 * CaseData table for a row matching the provided filename and returns true if an entry
 * exists, or false if it does not.
 */
function exists(db: Database, filename: string): boolean {
	const file = db.prepare<string, CaseData>(`
			SELECT 1 FROM CaseData WHERE name = ?;
		`)
		.get(filename);

	if (!file) {
		return false;
	}

	return true;
}

/**
 * Returns a SQL query string that selects all case data entries from the database. This is
 * used for iterating over all case data entries, such as when streaming data for all
 * files.
 */
function iterate() {
	return (`
		SELECT * FROM CaseData;
	`);
}

/**
 * Updates the case data entry for a given file in the database. It takes the existing
 * case data object, applies the provided updates (except for id, name, and path), and
 * updates the corresponding row in the CaseData table. It returns the updated case data
 * object. If the update fails, it throws an error.
 */
function update(db: Database, file: CaseData, updates: Partial<CaseData>): CaseData {
	if (updates.id !== undefined || updates.name !== undefined || updates.path !== undefined) {
		throw new Error('Cannot update id, name, or path fields for case data');
	}

	const merged: CaseData = {
		id: file.id,
		name: file.name,
		path: file.path,
		...file,
		...updates
	};

	const result = db.prepare(`
		UPDATE CaseData
		SET
			header = @header,
			completed = @completed,
			rows = @rows,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = @id;
		`)
	.run(merged);

	if (!result.changes) {
		throw new Error(`Failed to update file entry for: ${file.name}`);
	}

	return read(db, file.name);
}

/**
 * Removes the case data entry for a given file from the database. It first reads the
 * existing case data to ensure the entry exists, then deletes the corresponding row from
 * the CaseData table. It returns the original case data object that was removed. If the
 * deletion fails, it throws an error.
 */
function remove(db: Database, file: CaseData): CaseData {
	const original = read(db, file.name);
	if (original === null) {
		throw new Error(`File entry not found for deletion: ${file.name}`);
	}

	const result = db.prepare(`
		DELETE FROM CaseData
		WHERE id = ?
		`)
		.run(original.id);

	if (!result.changes) {
		throw new Error(`Failed to delete file entry for: ${file.name}`);
	}

	return original;
}