export default createFilesTable;

// Creates a new table for storing file metadata
function createFilesTable(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			current BOOLEAN DEFAULT 0,
			started BOOLEAN DEFAULT 0,
			completed BOOLEAN DEFAULT 0,
			buffer_size INTEGER DEFAULT 200,
			rows_cleaned INTEGER DEFAULT 0,
			rows_read INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);
}