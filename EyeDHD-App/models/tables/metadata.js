// Creates a new table for storing file metadata
export function createMetadataTable(db) {
  db.prepare(`
		CREATE TABLE IF NOT EXISTS metadata (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			request_size INTEGER NOT NULL,
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

export function deleteMetadataTable(db) {
  db.prepare(`
    DROP TABLE IF EXISTS metadata;
  `).run();
}
