import type { Database } from 'better-sqlite3';

export default { create, read, readAll, update, remove };

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

// Creates a new table for storing file metadata
export function createMetadataTable(db: Database) {
  db.prepare(
    `
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
	`
  ).run();

  // Migrate existing table by adding missing columns
  //migrateMetadataTable(db);
}

// Adds missing columns to existing metadata table for backward compatibility
// function migrateMetadataTable(db: Database) {
//   try {
//     // Get current table schema
//     const tableInfo = db.prepare(`PRAGMA table_info(metadata);`).all();
//     const existingColumns = new Set(tableInfo.map((col) => col.name));

//     // Handle column rename: buffer_size -> request_size
//     if (existingColumns.has('buffer_size') && !existingColumns.has('request_size')) {
//       console.log('Renaming column: buffer_size -> request_size');
//       // SQLite doesn't support RENAME COLUMN directly in older versions, so we copy the data
//       db.prepare(
//         `ALTER TABLE metadata ADD COLUMN request_size INTEGER NOT NULL DEFAULT 200;`
//       ).run();
//       db.prepare(`UPDATE metadata SET request_size = buffer_size;`).run();
//       // Note: We can't drop buffer_size in SQLite without recreating the table, so we leave it
//     }

//     // Define required columns with their default values
//     const requiredColumns = [
//       { name: 'request_size', type: 'INTEGER NOT NULL DEFAULT 200' },
//       { name: 'completed', type: 'BOOLEAN DEFAULT 0' },
//       { name: 'cleaned', type: 'INTEGER DEFAULT 0' },
//       { name: 'requested', type: 'INTEGER DEFAULT 0' },
//       { name: 'first_frame', type: 'INTEGER DEFAULT 0' },
//       { name: 'last_frame', type: 'INTEGER DEFAULT 0' },
//       { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
//       { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
//     ];

//     // Add missing columns
//     for (const column of requiredColumns) {
//       if (!existingColumns.has(column.name)) {
//         console.log(`Adding missing column to metadata table: ${column.name}`);
//         db.prepare(
//           `ALTER TABLE metadata ADD COLUMN ${column.name} ${column.type};`
//         ).run();
//       }
//     }
//   } catch (err) {
//     console.error('Error migrating metadata table:', err);
//     // Don't throw - table might not exist yet, which is fine
//   }
// }

export function deleteMetadataTable(db: Database) {
  db.prepare(
    `
    DROP TABLE IF EXISTS metadata;
  `
  ).run();
}

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
