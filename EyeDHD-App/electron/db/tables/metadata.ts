import type { Database } from 'better-sqlite3';

export default { create, exists, read, readAll, iterate, update, remove };

export type Metadata = {
  id: number;
  name: string;
  path: string;
  request_size: number;
  header: string;
  completed: number;
  cleaned: number;
  requested: number;
  first_frame: number;
  last_frame: number;
  created_at: string;
  updated_at: string;
};

// TODO: remove first and last frame, replace cleaned with row count, get rid of requested as no longer needed and resuming in progress is not nessassary, cleaned and requested will be part of progress, get rid of request_size

// Creates a new table for storing file metadata
export function createMetadataTable(db: Database) {
  db.prepare(`
		CREATE TABLE IF NOT EXISTS metadata (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			request_size INTEGER NOT NULL,
			header TEXT DEFAULT '',
			completed BOOLEAN DEFAULT 0,
			cleaned INTEGER DEFAULT 0,
			requested INTEGER DEFAULT 0,
			first_frame INTEGER DEFAULT 0,
			last_frame INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}

export function deleteMetadataTable(db: Database) {
  db.prepare(`
    DROP TABLE IF EXISTS metadata;
  `).run();
}

function create(
  db: Database,
  filename: string,
  filepath: string
): Metadata {
  const result = db.prepare<[string, string, number], Metadata>(`
 			INSERT INTO metadata (name, path, request_size)
 			VALUES (?, ?, ?);
		`)
    .run(filename, filepath, 1000);

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
	return `
		SELECT * FROM metadata;
	`;
}

function readAll(db: Database): Metadata[] {
  const files = db.prepare<[], Metadata>(`
      SELECT * FROM metadata;
		`)
    .all();

  return files;
}

function update(db: Database, file: Metadata): boolean {
  const result = db.prepare(`
      UPDATE metadata
		  SET
				request_size = @request_size,
				header = @header,
			  completed = @completed,
			  cleaned = @cleaned,
			  requested = @requested,
			  first_frame = @first_frame,
			  last_frame = @last_frame,
			  updated_at = CURRENT_TIMESTAMP
			WHERE id = @id;
		`)
    .run(file);

  if (!result.changes) {
    throw new Error(`Failed to update file entry for: ${file.name}`);
  }

  return true;
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