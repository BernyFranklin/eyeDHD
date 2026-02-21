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

// Creates a new table for storing file metadata
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

export function deleteMetadataTable(db: Database) {
  	db.prepare(`
    	DROP TABLE IF EXISTS metadata;
    `)
   .run();
}

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

function iterate() {
	return (`
		SELECT * FROM metadata;
	`);
}

function update(db: Database, file: Metadata, updates: Partial<Metadata>): Metadata {
	const result = db.prepare(`
    	UPDATE metadata
		SET
			header = @header,
			completed = @completed,
			rows = @rows,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = @id;
		`)
    .run(file);

  	if (!result.changes) {
    	throw new Error(`Failed to update file entry for: ${file.name}`);
   	}

    return read(db, file.name);
}

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