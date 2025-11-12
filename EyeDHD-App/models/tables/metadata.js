export default createMetadataTable;

// Creates a new table for storing file metadata
function createMetadataTable(db) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS metadata (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			buffer_size INTEGER NOT NULL,
			completed BOOLEAN DEFAULT 0,
			cleaned INTEGER DEFAULT 0,
			requested INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}