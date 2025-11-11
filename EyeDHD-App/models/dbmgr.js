import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

import createFilesTable from './tables/files';

export default function getDB(testing = false) {
    // Creates a temporary in memory database for testing
    if (testing) {
        const db = new Database(':memory:', { verbose: console.log });
        createFilesTable(db);

        return db;
    }

    const appRoot = app.getAppPath();
    const dbPath = path.join(appRoot, 'main.db');

    console.log(`Using database at ${dbPath}`);

    const db = new Database(dbPath);
    createFilesTable(db);

    // Set for performance
    db.pragma('journal_mode = WAL');
    // Clean up wal file if it gets too big
    setInterval(fs.stat.bind(null, path.join(appRoot, "main.db-wal"), (err, stat) => {
        if (err) {
            throw err;
        } else if (stat.size > 1e6) {
            db.pragma("wal_checkpoint(RESTART)");
        }
    }), 5000).unref();

	return db;
}
