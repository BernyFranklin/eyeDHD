import type { Database } from 'better-sqlite3';

export default {};

// Converts filename into table name
// ID.011.csv -> ID_011_saccades
export function toTableName(filename: string) {
	// Replace '.' with '_' in filename, and remove csv
	const name = filename.replace(/\./g, '_').replace(/_csv$/, '');
	return `${name}_saccades`;
}

export type SaccadeData = {
	filename: string;
};

export function createSaccadeTable(db: Database, filename: string) {
	db.prepare(`
			CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
				id INTEGER PRIMARY KEY AUTOINCREMENT
			);
		`)
		.run();
}

export function deleteSaccadeTable(db: Database, filename: string) {
	db.prepare(`
			DROP TABLE IF EXISTS ${toTableName(filename)};
		`)
		.run();
}