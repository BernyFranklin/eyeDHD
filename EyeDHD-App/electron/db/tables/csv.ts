import type { Database } from 'better-sqlite3';
import type { Metadata } from './metadata';

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
	Frame: number;
	CaptureTime: number;
	LogTime: number;
	HMDPositionX: number;
	HMDPositionY: number;
	HMDPositionz: number;
	HMDRotationX: number;
	HMDRotationY: number;
	HMDRotationZ: number;
	HMDRotationHuh: number;
	GazeStatus: string;
	CombinedGazeForwardX: number;
	CombinedGazeForwardY: number;
	CombinedGazeForwardZ: number;
	CombinedGazePositionX: number;
	CombinedGazePositionY: number;
	CombinedGazePositionZ: number;
	InterPupillaryDistanceInMM: number;
	LeftEyeStatus: string;
	LeftEyeForwardX: number;
	LeftEyeForwardY: number;
	LeftEyeForwardZ: number;
	LeftEyePositionX: number;
	LeftEyePositionY: number;
	LeftEyePositionZ: number;
	LeftPupilIrisDiameterRatio: number;
	LeftPupilDiameterInMM: number;
	LeftIrisDiameterInMM: number;
	LeftEyeOpenness: number;
	RightEyeStatus: string;
	RightEyeForwardX: number;
	RightEyeForwardY: number;
	RightEyeForwardZ: number;
	RightEyePositionX: number;
	RightEyePositionY: number;
	RightEyePositionZ: number;
	RightPupilIrisDiameterRatio: number;
	RightPupilDiameterInMM: number;
	RightIrisDiameterInMM: number;
	RightEyeOpenness: number;
	FocusDistance: number;
	FocusStability: number;
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
				HMDPositionX REAL DEFAULT 0,
				HMDPositionY REAL DEFAULT 0,
				HMDPositionz REAL DEFAULT 0,
				HMDRotationX REAL DEFAULT 0,
				HMDRotationY REAL DEFAULT 0,
				HMDRotationZ REAL DEFAULT 0,
				HMDRotationHuh REAL DEFAULT 0,
				GazeStatus TEXT DEFAULT 'INVALID',
				CombinedGazeForwardX REAL DEFAULT 0,
				CombinedGazeForwardY REAL DEFAULT 0,
				CombinedGazeForwardZ REAL DEFAULT 0,
				CombinedGazePositionX REAL DEFAULT 0,
				CombinedGazePositionY REAL DEFAULT 0,
				CombinedGazePositionZ REAL DEFAULT 0,
				InterPupillaryDistanceInMM REAL DEFAULT 0,
				LeftEyeStatus TEXT DEFAULT 'INVALID',
				LeftEyeForwardX REAL DEFAULT 0,
				LeftEyeForwardY REAL DEFAULT 0,
				LeftEyeForwardZ REAL DEFAULT 0,
				LeftEyePositionX REAL DEFAULT 0,
				LeftEyePositionY REAL DEFAULT 0,
				LeftEyePositionZ REAL DEFAULT 0,
				LeftPupilIrisDiameterRatio REAL DEFAULT 0,
				LeftPupilDiameterInMM REAL DEFAULT 0,
				LeftIrisDiameterInMM REAL DEFAULT 0,
				LeftEyeOpenness REAL DEFAULT 0,
				RightEyeStatus TEXT DEFAULT 'INVALID',
				RightEyeForwardX REAL DEFAULT 0,
				RightEyeForwardY REAL DEFAULT 0,
				RightEyeForwardZ REAL DEFAULT 0,
				RightEyePositionX REAL DEFAULT 0,
				RightEyePositionY REAL DEFAULT 0,
				RightEyePositionZ REAL DEFAULT 0,
				RightPupilIrisDiameterRatio REAL DEFAULT 0,
				RightPupilDiameterInMM REAL DEFAULT 0,
				RightIrisDiameterInMM REAL DEFAULT 0,
				RightEyeOpenness REAL DEFAULT 0,
				FocusDistance REAL DEFAULT 0,
				FocusStability REAL DEFAULT 0
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
function create(db: Database, file: Metadata, rows: CSVData[]): boolean {
	const table = toTableName(file.name);
	const insert = db.prepare(`
			INSERT INTO ${table} (
				Frame,
				CaptureTime,
				LogTime,
				HMDPositionX,
				HMDPositionY,
				HMDPositionz,
				HMDRotationX,
				HMDRotationY,
				HMDRotationZ,
				HMDRotationHuh,
				GazeStatus,
				CombinedGazeForwardX,
				CombinedGazeForwardY,
				CombinedGazeForwardZ,
				CombinedGazePositionX,
				CombinedGazePositionY,
				CombinedGazePositionZ,
				InterPupillaryDistanceInMM,
				LeftEyeStatus,
				LeftEyeForwardX,
				LeftEyeForwardY,
				LeftEyeForwardZ,
				LeftEyePositionX,
				LeftEyePositionY,
				LeftEyePositionZ,
				LeftPupilIrisDiameterRatio,
				LeftPupilDiameterInMM,
				LeftIrisDiameterInMM,
				LeftEyeOpenness,
				RightEyeStatus,
				RightEyeForwardX,
				RightEyeForwardY,
				RightEyeForwardZ,
				RightEyePositionX,
				RightEyePositionY,
				RightEyePositionZ,
				RightPupilIrisDiameterRatio,
				RightPupilDiameterInMM,
				RightIrisDiameterInMM,
				RightEyeOpenness,
				FocusDistance,
				FocusStability
			)
			VALUES (
				@Frame,
				@CaptureTime,
				@LogTime,
				@HMDPositionX,
				@HMDPositionY,
				@HMDPositionz,
				@HMDRotationX,
				@HMDRotationY,
				@HMDRotationZ,
				@HMDRotationHuh,
				@GazeStatus,
				@CombinedGazeForwardX,
				@CombinedGazeForwardY,
				@CombinedGazeForwardZ,
				@CombinedGazePositionX,
				@CombinedGazePositionY,
				@CombinedGazePositionZ,
				@InterPupillaryDistanceInMM,
				@LeftEyeStatus,
				@LeftEyeForwardX,
				@LeftEyeForwardY,
				@LeftEyeForwardZ,
				@LeftEyePositionX,
				@LeftEyePositionY,
				@LeftEyePositionZ,
				@LeftPupilIrisDiameterRatio,
				@LeftPupilDiameterInMM,
				@LeftIrisDiameterInMM,
				@LeftEyeOpenness,
				@RightEyeStatus,
				@RightEyeForwardX,
				@RightEyeForwardY,
				@RightEyeForwardZ,
				@RightEyePositionX,
				@RightEyePositionY,
				@RightEyePositionZ,
				@RightPupilIrisDiameterRatio,
				@RightPupilDiameterInMM,
				@RightIrisDiameterInMM,
				@RightEyeOpenness,
				@FocusDistance,
				@FocusStability
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
function iterate(file: Metadata) {
	return (`
		SELECT * FROM ${toTableName(file.name)};
	`);
}