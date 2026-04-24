import path from 'path';
import type { Database, Statement } from 'better-sqlite3';

export default {
	create,
	exists,
	read,
	iterate,
	update,
	remove,
	caseBaseName,
	csvImportPath,
	csvOutputPath,
	pupilOutputDir,
	pupilPerFramePath
};

/**
 * User-defined event marker with start/end timestamps in milliseconds.
 */
export type SegmentInput = {
	id: string;
	startMs: number;
	endMs: number;
};

/**
 * User-defined detection threshold overrides. All fields optional — omitted
 * fields fall back to pipeline defaults at processing time.
 */
export type DetectionConfig = {
	velocityThresholdDegPerSec?: number;
	minDurationMs?: number;
	minInterSaccadeMs?: number;
	amplitudeBounds?: { min?: number; max?: number };
};

/**
 * CaseData type represents the metadata and processing status of a CSV file in the
 * database. It includes fields for the file's unique identifier, name, path, header
 * information, task completion status, number of cleaned rows, and timestamps for
 * creation and last update. The tasks field is an object that tracks the completion
 * status of various processing tasks (cleaning, detection, animation) as
 * boolean values.
 */
export type CaseData = {
	id: number;
	name: string;
	path: string;
	header: string;
	tasks: {
		cleaning: boolean;
		detection: boolean;
		pupil: boolean;
		animation: boolean;
	};
	cleaned_rows: number;
	segments: SegmentInput[] | null;
	detection_config: DetectionConfig | null;
	created_at: string;
	updated_at: string;
};

// Bitfield <-> Object mapping

export type CaseDataRaw = Omit<CaseData, 'tasks' | 'segments' | 'detection_config'> & {
	tasks: number;
	segments: string | null;
	detection_config: string | null;
};

export type CaseDataUpdate = Omit<Partial<CaseData>, 'tasks'> & {
	tasks?: Partial<CaseData['tasks']>;
};

const TASK_FLAGS = {
	cleaning: 1 << 0,
	detection: 1 << 1,
	// 1 << 2 reserved (previously visualization; folded into detection)
	// 1 << 4 reserved (previously combination; feature removed)
	animation: 1 << 3,
	pupil: 1 << 5
} as const;

function parseJsonColumn<T>(value: string | null): T | null {
	if (value === null || value === undefined) return null;
	return JSON.parse(value) as T;
}

function toJsonColumn<T>(value: T | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	return JSON.stringify(value);
}

function rawToCase(raw: CaseDataRaw): CaseData {
	return {
		...raw,
		tasks: flagsToTasks(raw.tasks),
		segments: parseJsonColumn<SegmentInput[]>(raw.segments),
		detection_config: parseJsonColumn<DetectionConfig>(raw.detection_config),
	};
}

function tasksToFlags(tasks: CaseData['tasks']): number {
	let flags = 0;
	if (tasks.cleaning) flags |= TASK_FLAGS.cleaning;
	if (tasks.detection) flags |= TASK_FLAGS.detection;
	if (tasks.pupil) flags |= TASK_FLAGS.pupil;
	if (tasks.animation) flags |= TASK_FLAGS.animation;
	return flags;
}

function flagsToTasks(flags: number): CaseData['tasks'] {
	return {
		cleaning: (flags & TASK_FLAGS.cleaning) !== 0,
		detection: (flags & TASK_FLAGS.detection) !== 0,
		pupil: (flags & TASK_FLAGS.pupil) !== 0,
		animation: (flags & TASK_FLAGS.animation) !== 0
	};
}

/**
 * Creates the CaseData table in the database if it does not already exist.
 */
export function createCaseDataTable(db: Database) {
	db.prepare(`
		CREATE TABLE IF NOT EXISTS CaseData (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT UNIQUE NOT NULL,
			path TEXT NOT NULL,
			header TEXT DEFAULT '',
			tasks INTEGER DEFAULT 0,
			cleaned_rows INTEGER DEFAULT 0,
			segments TEXT DEFAULT NULL,
			detection_config TEXT DEFAULT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`).run();

	// Migrate existing databases that lack the new columns
	const columns = db.prepare(`PRAGMA table_info(CaseData)`).all() as { name: string }[];
	const colNames = new Set(columns.map(c => c.name));
	if (!colNames.has('segments')) {
		db.prepare(`ALTER TABLE CaseData ADD COLUMN segments TEXT DEFAULT NULL`).run();
	}
	if (!colNames.has('detection_config')) {
		db.prepare(`ALTER TABLE CaseData ADD COLUMN detection_config TEXT DEFAULT NULL`).run();
	}
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
	const result = db.prepare<[string, string], CaseDataRaw>(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run(filename, filepath);

	const trial = db.prepare<[number | bigint], CaseDataRaw>(`
			SELECT * FROM CaseData WHERE id = ?;
		`)
		.get(result.lastInsertRowid);

	if (!trial) {
		throw new Error(`Failed to create file entry for: ${filename}`);
	}

	return rawToCase(trial);
}

/**
 * Reads the case data for a given filename from the database. It queries the CaseData
 * table for a row matching the provided filename and returns the corresponding case
 * data object. If no matching entry is found, it throws an error.
 */
function read(db: Database, filename: string): CaseData {
	const trial = db.prepare<string, CaseDataRaw>(`
		SELECT * FROM CaseData WHERE name = ?;
	`)
	.get(filename);

	if (!trial) {
		throw new Error(`File entry not found for: ${filename}`);
	}

	return rawToCase(trial);
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

type CaseDataIterStatement = Omit<
	Statement<[], CaseDataRaw>,
	'iterate'
> & {
	iterate(): IterableIterator<CaseData>
};

/**
 * Returns a SQL query string that selects all case data entries from the database. This
 * is used for iterating over all case data entries, such as when streaming data for all
 * files.
 */
function iterate(db: Database): CaseDataIterStatement {
	const stmt = db.prepare<[], CaseDataRaw>(`
		SELECT * FROM CaseData;
	`);
	const iterateRaw = stmt.iterate.bind(stmt);

	return Object.assign(stmt, {
		iterate: function* () {
			for (const row of iterateRaw()) {
				yield rawToCase(row);
			}
		}
	}) as CaseDataIterStatement;
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

	const { tasks: taskUpdates, ...restUpdates } = updates;
	const mergedTasks = taskUpdates
		? { ...trial.tasks, ...taskUpdates }
		: trial.tasks;

	const merged: CaseData = {
		...trial,
		...restUpdates,
		tasks: mergedTasks,
		segments: updates.segments !== undefined ? updates.segments : trial.segments,
		detection_config: updates.detection_config !== undefined ? updates.detection_config : trial.detection_config,
	};

	const payload: CaseDataRaw = {
		...merged,
		tasks: tasksToFlags(merged.tasks),
		segments: toJsonColumn(merged.segments),
		detection_config: toJsonColumn(merged.detection_config),
	};

	const result = db.prepare(`
		UPDATE CaseData
		SET
			header = @header,
			tasks = @tasks,
			cleaned_rows = @cleaned_rows,
			segments = @segments,
			detection_config = @detection_config,
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

export function animationOutputPath(trial: CaseData): string {
	const baseName = caseBaseName(trial);
	return path.join(trial.path, 'outputs', `${baseName}_Animated.mp4`);
}

/** Root directory where the pupil bundle writes its files. */
export function pupilOutputDir(trial: CaseData): string {
	return path.join(trial.path, 'outputs');
}

/** Canonical artifact used by recovery to detect a successful pupil run. */
export function pupilPerFramePath(trial: CaseData): string {
	return path.join(trial.path, 'outputs', 'analysis', 'pupil-per-frame.csv');
}