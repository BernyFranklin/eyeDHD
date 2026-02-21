import type { Database } from 'better-sqlite3';

export default {};

/**
 * Converts a filename into a valid table name by replacing '.' with '_' and appending
 * '_saccades' to the end.
 *
 * ID.011.csv -> ID_011_saccades
 */
export function toTableName(filename: string) {
	const name = filename.replace(/\./g, '_').replace(/_csv$/, '');
	return `${name}_saccades`;
}

export type SaccadeData = {
	filename: string;
};

/**
 * Creates a new table for storing saccade data associated with a specific file. The
 * table name is derived from the filename.
 */
export function createSaccadeTable(db: Database, filename: string) {
	db.prepare(`
			CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
				id INTEGER PRIMARY KEY AUTOINCREMENT
			);
		`)
		.run();
}

/**
 * Drops the saccade data table associated with a specific file. This is typically used
 * for testing purposes to reset the database state.
 */
export function deleteSaccadeTable(db: Database, filename: string) {
	db.prepare(`
			DROP TABLE IF EXISTS ${toTableName(filename)};
		`)
		.run();
}