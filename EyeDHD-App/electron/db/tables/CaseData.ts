import path from 'path';
import type { Database } from 'better-sqlite3';

export default {
	create,
	exists,
	read,
	iterate,
	update,
	remove,
	caseBaseName,
	csvImportPath,
	csvOutputPath
};

// Update code to replace cleaned w/ completed, storing as a single INTEGER in
// database and using bitwise operations to set and retrieve
export type CaseData = {
	id: number;
	name: string;
	path: string;
	header: string;
	completed: {
		cleaning: boolean;
		detecting: boolean;
		visualizing: boolean;
		animating: boolean;
		stitching: boolean;
	};
	cleaned_rows: number;
	created_at: string;
	updated_at: string;
};

type CaseDataRow = Omit<CaseData, 'completed'> & { completed: number };
type CaseDataInput = CaseData | CaseDataRow;

export type CaseDataUpdate = Omit<Partial<CaseData>, 'completed'> & {
	completed?: Partial<CaseData['completed']>;
};

const COMPLETION_FLAGS = {
	cleaning: 1 << 0,
	detecting: 1 << 1,
	visualizing: 1 << 2,
	animating: 1 << 3,
	stitching: 1 << 4
} as const;

function completedToFlags(completed: CaseData['completed']): number {
	let flags = 0;
	if (completed.cleaning) flags |= COMPLETION_FLAGS.cleaning;
	if (completed.detecting) flags |= COMPLETION_FLAGS.detecting;
	if (completed.visualizing) flags |= COMPLETION_FLAGS.visualizing;
	if (completed.animating) flags |= COMPLETION_FLAGS.animating;
	if (completed.stitching) flags |= COMPLETION_FLAGS.stitching;
	return flags;
}

function flagsToCompleted(flags: number): CaseData['completed'] {
	return {
		cleaning: (flags & COMPLETION_FLAGS.cleaning) !== 0,
		detecting: (flags & COMPLETION_FLAGS.detecting) !== 0,
		visualizing: (flags & COMPLETION_FLAGS.visualizing) !== 0,
		animating: (flags & COMPLETION_FLAGS.animating) !== 0,
		stitching: (flags & COMPLETION_FLAGS.stitching) !== 0
	};
}

export function normalizeCaseData(row: CaseDataInput): CaseData {
	const completed = typeof row.completed === 'number'
		? flagsToCompleted(row.completed)
		: row.completed;

	return {
		...row,
		completed
	};
}

/**
 * Creates the CaseData table in the database if it doesn't already exist. The CaseData
 * table stores information about each CSV file, including its name, path, header,
 * completion status, number of rows, and timestamps for creation and last update.
 */
export function createCaseDataTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS CaseData (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			header TEXT DEFAULT '',
			completed INTEGER DEFAULT 0,
			cleaned_rows INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();
}

/**
 * Drops the CaseData table from the database. This is typically used for testing purposes
 * to reset the database state.
 */
export function deleteCaseDataTable(db: Database) {
	db.prepare(`
		DROP TABLE IF EXISTS CaseData;
	`)
	.run();
}

/**
 * Creates a new CaseData entry for a CSV file in the database. It takes the filename and
 * filepath as parameters, inserts a new row into the CaseData table, and returns the
 * created case data object. If the insertion fails, it throws an error.
 */
function create(
	db: Database,
	filename: string,
	filepath: string
): CaseData {
	const result = db.prepare<[string, string], CaseDataRow>(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run(filename, filepath);

	const file = db.prepare<[number | bigint], CaseDataRow>(`
			SELECT * FROM CaseData WHERE id = ?;
		`)
		.get(result.lastInsertRowid);

	if (!file) {
		throw new Error(`Failed to create file entry for: ${filename}`);
	}

	return normalizeCaseData(file);
}

/**
 * Reads the case data for a given filename from the database. It queries the CaseData
 * table for a row matching the provided filename and returns the corresponding case
 * data object. If no matching entry is found, it throws an error.
 */
function read(db: Database, filename: string): CaseData {
	const file = db.prepare<string, CaseDataRow>(`
		SELECT * FROM CaseData WHERE name = ?;
	`)
	.get(filename);

	if (!file) {
		throw new Error(`File entry not found for: ${filename}`);
	}

	return normalizeCaseData(file);
}

/**
 * Checks if a case data entry exists for a given filename in the database. It queries the
 * CaseData table for a row matching the provided filename and returns true if an entry
 * exists, or false if it does not.
 */
function exists(db: Database, filename: string): boolean {
	const file = db.prepare<string, CaseData>(`
			SELECT 1 FROM CaseData WHERE name = ?;
		`)
		.get(filename);

	if (!file) {
		return false;
	}

	return true;
}

/**
 * Returns a SQL query string that selects all case data entries from the database. This is
 * used for iterating over all case data entries, such as when streaming data for all
 * files.
 */
function iterate() {
	return (`
		SELECT * FROM CaseData;
	`);
}

/**
 * Updates the case data entry for a given file in the database. It takes the existing
 * case data object, applies the provided updates (except for id, name, and path), and
 * updates the corresponding row in the CaseData table. It returns the updated case data
 * object. If the update fails, it throws an error.
 */
function update(
	db: Database,
	trial: CaseData,
	updates: CaseDataUpdate
): CaseData {
	if (updates.id !== undefined || updates.name !== undefined || updates.path !== undefined) {
		throw new Error('Cannot update id, name, or path fields for case data');
	}

	const { completed: completedUpdates, ...restUpdates } = updates;
	const mergedCompleted = completedUpdates
		? { ...trial.completed, ...completedUpdates }
		: trial.completed;

	const merged: CaseData = {
		id: trial.id,
		name: trial.name,
		path: trial.path,
		...trial,
		...restUpdates,
		completed: mergedCompleted
	};

	const payload: CaseDataRow = {
		...merged,
		completed: completedToFlags(merged.completed)
	};

	const result = db.prepare(`
		UPDATE CaseData
		SET
			header = @header,
			completed = @completed,
			cleaned_rows = @cleaned_rows,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = @id;
		`)
	.run(payload);

	if (!result.changes) {
		throw new Error(`Failed to update file entry for: ${trial.name}`);
	}

	return read(db, trial.name);
}

/**
 * Removes the case data entry for a given file from the database. It first reads the
 * existing case data to ensure the entry exists, then deletes the corresponding row from
 * the CaseData table. It returns the original case data object that was removed. If the
 * deletion fails, it throws an error.
 */
function remove(db: Database, trial: CaseData): CaseData {
	const original = read(db, trial.name);
	if (original === null) {
		throw new Error(`File entry not found for deletion: ${trial.name}`);
	}

	const result = db.prepare(`
		DELETE FROM CaseData
		WHERE id = ?
		`)
		.run(original.id);

	if (!result.changes) {
		throw new Error(`Failed to delete file entry for: ${trial.name}`);
	}

	return original;
}

export function caseBaseName(trial: CaseData): string {
	const lowerName = trial.name.toLowerCase();
	if (lowerName.endsWith('.csv')) {
		return trial.name.slice(0, -4);
	}
	return trial.name;
}

export function csvImportPath(trial: CaseData): string {
	const baseName = caseBaseName(trial);
	return path.join(trial.path, 'imports', `${baseName}.csv`);
}

export function csvOutputPath(trial: CaseData): string {
	const baseName = caseBaseName(trial);
	return path.join(trial.path, 'outputs', `${baseName}_Cleaned.csv`);
}