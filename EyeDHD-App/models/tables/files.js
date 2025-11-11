export default createFilesTable;

// Creates a new table for storing file metadata
function createFilesTable(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS files (
      		id INTEGER PRIMARY KEY AUTOINCREMENT,
      		name TEXT UNIQUE NOT NULL,
      		path TEXT NOT NULL,
      		buffer_size INTEGER NOT NULL,
      		current BOOLEAN DEFAULT 0,
      		started BOOLEAN DEFAULT 0,
      		completed BOOLEAN DEFAULT 0,
      		rows_cleaned INTEGER DEFAULT 0,
      		rows_read INTEGER DEFAULT 0,
      		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `).run();
}