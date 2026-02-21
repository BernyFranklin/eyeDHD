import type { Database } from 'better-sqlite3';

export default { create, exists, read, iterate, update, remove };

export type Metadata = {
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
 * Creates the metadata table in the database if it doesn't already exist. The metadata
 * table stores information about each CSV file, including its name, path, header,
 * completion status, number of rows, and timestamps for creation and last update.
 */
export function createMetadataTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS metadata (
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
 * Drops the metadata table from the database. This is typically used for testing purposes
 * to reset the database state.
 */
export function deleteMetadataTable(db: Database) {
  	db.prepare(`
    	DROP TABLE IF EXISTS metadata;
    `)
   .run();
}

/**
 * Creates a new metadata entry for a CSV file in the database. It takes the filename and
 * filepath as parameters, inserts a new row into the metadata table, and returns the
 * created metadata object. If the insertion fails, it throws an error.
 */
function create(
	db: Database,
	filename: string,
	filepath: string
): Metadata {
  	const result = db.prepare<[string, string], Metadata>(`
	   		INSERT INTO metadata (name, path)
	     	VALUES (?, ?);
      	`)
    	.run(filename, filepath);

   	const file = db.prepare<[number | bigint], Metadata>(`
	      	SELECT * FROM metadata WHERE id = ?;
		`)
    	.get(result.lastInsertRowid);

    if (!file) {
    	throw new Error(`Failed to create file entry for: ${filename}`);
    }

    return file;
}

/**
 * Reads the metadata for a given filename from the database. It queries the metadata
 * table for a row matching the provided filename and returns the corresponding metadata
 * object. If no matching entry is found, it throws an error.
 */
function read(db: Database, filename: string): Metadata {
  	const file = db.prepare<string, Metadata>(`
    	SELECT * FROM metadata WHERE name = ?;
	`)
    .get(filename);

   	if (!file) {
    	throw new Error(`File entry not found for: ${filename}`);
   	}

  return file;
}

/**
 * Checks if a metadata entry exists for a given filename in the database. It queries the
 * metadata table for a row matching the provided filename and returns true if an entry
 * exists, or false if it does not.
 */
function exists(db: Database, filename: string): boolean {
	const file = db.prepare<string, Metadata>(`
			SELECT 1 FROM metadata WHERE name = ?;
		`)
		.get(filename);

	if (!file) {
		return false;
	}

	return true;
}

/**
 * Returns a SQL query string that selects all metadata entries from the database. This is
 * used for iterating over all metadata entries, such as when streaming data for all
 * files.
 */
function iterate() {
	return (`
		SELECT * FROM metadata;
	`);
}

/**
 * Updates the metadata entry for a given file in the database. It takes the existing
 * metadata object, applies the provided updates (except for id, name, and path), and
 * updates the corresponding row in the metadata table. It returns the updated metadata
 * object. If the update fails, it throws an error.
 */
function update(db: Database, file: Metadata, updates: Partial<Metadata>): Metadata {
	if (updates.id !== undefined || updates.name !== undefined || updates.path !== undefined) {
		throw new Error('Cannot update id, name, or path fields for metadata');
	}

	const merged: Metadata = {
		id: file.id,
		name: file.name,
		path: file.path,
		...file,
		...updates
	};

	const result = db.prepare(`
    	UPDATE metadata
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
 * Removes the metadata entry for a given file from the database. It first reads the
 * existing metadata to ensure the entry exists, then deletes the corresponding row from
 * the metadata table. It returns the original metadata object that was removed. If the
 * deletion fails, it throws an error.
 */
function remove(db: Database, file: Metadata): Metadata {
  	const original = read(db, file.name);
   	if (original === null) {
    	throw new Error(`File entry not found for deletion: ${file.name}`);
    }

    const result = db.prepare(`
    	DELETE FROM metadata
     	WHERE id = ?
      	`)
    	.run(original.id);

    if (!result.changes) {
    	throw new Error(`Failed to delete file entry for: ${file.name}`);
    }

    return original;
}