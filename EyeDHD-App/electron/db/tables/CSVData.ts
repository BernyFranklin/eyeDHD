import type { Database } from 'better-sqlite3';
import type { CaseData } from './CaseData';

export default { create, iterate };

/**
 * Converts a filename into a valid table name by replacing '.' with '_' and appending
 * '_rows' to the end.
 *
 * ID.011.csv -> ID_011_csv_rows
 */
export function toTableName(filename: string) {
	const name = filename.replace(/\./g, '_');
	return `${name}_rows`;
}

export type CSVData = {
	Frame: number; // Keep
	CaptureTime: number; // Keep
	LogTime: number; // Keep
	// HMDPositionX: number;
	// HMDPositionY: number;
	// HMDPositionz: number;
	// HMDRotationX: number;
	// HMDRotationY: number;
	// HMDRotationZ: number;
	// HMDRotationHuh: number;
	GazeStatus: string; // Keep
	CombinedGazeForwardX: number; // Keep
	CombinedGazeForwardY: number; // Keep
	CombinedGazeForwardZ: number; // Keep
	// CombinedGazePositionX: number;
	// CombinedGazePositionY: number;
	// CombinedGazePositionZ: number;
	// InterPupillaryDistanceInMM: number;
	LeftEyeStatus: string; // Keep
	LeftEyeForwardX: number; // Keep
	LeftEyeForwardY: number; // Keep
	LeftEyeForwardZ: number; // Keep
	// LeftEyePositionX: number;
	// LeftEyePositionY: number;
	// LeftEyePositionZ: number;
	// LeftPupilIrisDiameterRatio: number;
	LeftPupilDiameterInMM: number; // Keep
	// LeftIrisDiameterInMM: number;
	// LeftEyeOpenness: number;
	RightEyeStatus: string; // Keep
	RightEyeForwardX: number; // Keep
	RightEyeForwardY: number; // Keep
	RightEyeForwardZ: number; // Keep
	// RightEyePositionX: number;
	// RightEyePositionY: number;
	// RightEyePositionZ: number;
	// RightPupilIrisDiameterRatio: number;
	RightPupilDiameterInMM: number; // Keep
	// RightIrisDiameterInMM: number;
	// RightEyeOpenness: number;
	// FocusDistance: number;
	// FocusStability: number;
};

/**
 * Creates a new table for storing CSV data. The table name is derived from the filename
 * by replacing '.' with '_' and appending '_rows' to the end.
 */
export function createCSVTable(db: Database, filename: string) {
	db.prepare(`
			CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
				Frame INTEGER PRIMARY KEY NOT NULL,
				CaptureTime INTEGER DEFAULT 0,
				LogTime INTEGER DEFAULT 0,
				GazeStatus TEXT DEFAULT 'INVALID',
				CombinedGazeForwardX REAL DEFAULT 0,
				CombinedGazeForwardY REAL DEFAULT 0,
				CombinedGazeForwardZ REAL DEFAULT 0,
				LeftEyeStatus TEXT DEFAULT 'INVALID',
				LeftEyeForwardX REAL DEFAULT 0,
				LeftEyeForwardY REAL DEFAULT 0,
				LeftEyeForwardZ REAL DEFAULT 0,
				LeftPupilDiameterInMM REAL DEFAULT 0,
				RightEyeStatus TEXT DEFAULT 'INVALID',
				RightEyeForwardX REAL DEFAULT 0,
				RightEyeForwardY REAL DEFAULT 0,
				RightEyeForwardZ REAL DEFAULT 0,
				RightPupilDiameterInMM REAL DEFAULT 0
			);
		`)
		.run();
}

/**
 * Deletes the table associated with the given filename. The table name is derived from
 * the filename by replacing '.' with '_' and appending '_rows' to the end.
 */
export function deleteCSVTable(db: Database, filename: string) {
	db.prepare(`
			DROP TABLE IF EXISTS ${toTableName(filename)};
		`)
		.run();
}

/**
 * Inserts multiple rows of CSV data into the table associated with the given file.
 *
 * If a row with the same Frame primary key already exists, it will be skipped and a
 * warning will be logged.
 */
function create(db: Database, file: CaseData, rows: CSVData[]): boolean {
	const table = toTableName(file.name);
	const insert = db.prepare(`
			INSERT INTO ${table} (
				Frame,
				CaptureTime,
				LogTime,
				GazeStatus,
				CombinedGazeForwardX,
				CombinedGazeForwardY,
				CombinedGazeForwardZ,
				LeftEyeStatus,
				LeftEyeForwardX,
				LeftEyeForwardY,
				LeftEyeForwardZ,
				LeftPupilDiameterInMM,
				RightEyeStatus,
				RightEyeForwardX,
				RightEyeForwardY,
				RightEyeForwardZ,
				RightPupilDiameterInMM
			)
			VALUES (
				@Frame,
				@CaptureTime,
				@LogTime,
				@GazeStatus,
				@CombinedGazeForwardX,
				@CombinedGazeForwardY,
				@CombinedGazeForwardZ,
				@LeftEyeStatus,
				@LeftEyeForwardX,
				@LeftEyeForwardY,
				@LeftEyeForwardZ,
				@LeftPupilDiameterInMM,
				@RightEyeStatus,
				@RightEyeForwardX,
				@RightEyeForwardY,
				@RightEyeForwardZ,
				@RightPupilDiameterInMM
			);
		`);

	const insertMany = db.transaction((rows: CSVData[]) => {
		for (const row of rows) {
			try {
				insert.run(row);
			} catch (err) {
				// If error is that the Frame primary key already exists continue
				if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.warn(
						`Frame ${row.Frame} already exists in table ${table}. Skipping insert.`
					);
					continue;
				} else {
					throw err;
				}
			}
		}
	});

	insertMany(rows);

	return true;
}

/**
 * Returns a SQL query string to select all rows from the table associated with the given
 * file.
 */
function iterate(file: CaseData) {
	return (`
		SELECT * FROM ${toTableName(file.name)};
	`);
}