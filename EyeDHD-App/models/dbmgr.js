import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

import createDocumentsTable from './tables/documents';

let db;

export default function getDB() {
	if (!db) {
		const appRoot = app.getAppPath();
		const dbPath = path.join(appRoot, 'main.db');

		console.log(`Using database at ${dbPath}`);
		db = new Database(dbPath);

		createDocumentsTable(db);
	}

	return db;
}