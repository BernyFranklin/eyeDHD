export default createDocumentsTable;

function createDocumentsTable(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			filename TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			started BOOLEAN,
			completed BOOLEAN,
			rows_cleaned INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`);
}