import type { Database } from 'better-sqlite3';
import type { Metadata } from '../tables/metadata.ts';

export default { create, read, readAll, update, remove };

function create(
  db: Database,
  filename: string,
  filepath: string,
  request_size: number
): Metadata | null {
  try {
    const result = db
      .prepare<[string, string, number], Metadata>(
        `
  			INSERT INTO metadata (name, path, request_size)
  			VALUES (?, ?, ?);
  		`
      )
      .run(filename, filepath, request_size);

    const file = db
      .prepare<any, Metadata>(
        `
        SELECT * FROM metadata WHERE id = ?;
			`
      )
      .get(result.lastInsertRowid);

    if (!file) {
      throw new Error(`Failed to create file entry for: ${filename}`);
    }

    return file;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function read(db: Database, filename: string): Metadata | null {
  try {
    const file = db
      .prepare<string, Metadata>(
        `
        SELECT * FROM metadata WHERE name = ?;
			`
      )
      .get(filename);

    if (!file) {
      return null;
    }

    return file;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function readAll(db: Database): Metadata[] | null {
  try {
    const files = db
      .prepare<[], Metadata>(
        `
        SELECT * FROM metadata;
			`
      )
      .all();

    return files;
  } catch (err) {
    console.error(err);

    return null;
  }
}

function update(db: Database, file: Metadata): boolean {
  try {
    const result = db
      .prepare(
        `
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
			`
      )
      .run(file);

    if (!result.changes) {
      throw new Error(`Failed to update file entry for: ${file.name}`);
    }

    return true;
  } catch (err) {
    console.error(err);

    return false;
  }
}

function remove(db: Database, file: Metadata): Metadata | null {
  try {
    const original = read(db, file.name);
    if (original === null) {
      throw new Error(`File entry not found for deletion: ${file.name}`);
    }

    const result = db
      .prepare(
        `
        DELETE FROM metadata
			  WHERE id = ?
			`
      )
      .run(original.id);

    if (!result.changes) {
      throw new Error(`Failed to delete file entry for: ${file.name}`);
    }

    return original;
  } catch (err) {
    console.error(err);

    return null;
  }
}
