import type { Database } from 'better-sqlite3';
import type { FileMetadata } from '../tables/metadata.ts';

export default { create, read, readAll, update, remove };

function create(
  db: Database,
  filename: string,
  filepath: string,
  request_size: number
): FileMetadata | null {
  try {
    const result = db
      .prepare<[string, string, number], FileMetadata>(
        `
  			INSERT INTO metadata (name, path, request_size)
  			VALUES (?, ?, ?);
  		`
      )
      .run(filename, filepath, request_size);

    const file = db
      .prepare<any, FileMetadata>(
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

function read(db: Database, filename: string): FileMetadata | null {
  try {
    const file = db
      .prepare<string, FileMetadata>(
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

function readAll(db: Database): FileMetadata[] | null {
  try {
    const files = db
      .prepare<[], FileMetadata>(
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

function update(db: Database, file: FileMetadata): boolean {
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

function remove(db: Database, file: FileMetadata): FileMetadata | null {
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
