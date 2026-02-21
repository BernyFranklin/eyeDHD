import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import { createMetadataTable, type Metadata } from '../../../db/tables/metadata';
import csvActions, { createCSVTable, deleteCSVTable, toTableName, type CSVData } from '../../../db/tables/csv';

describe('Database - CSVData', () => {
	let db: Database;

	const seedMetadata = () => {
		createMetadataTable(db);

		db.prepare(`
				INSERT INTO metadata (name, path)
				VALUES (?, ?);
			`)
			.run('test.csv', 'test.csv');

		db.prepare(`
				INSERT INTO metadata (name, path)
				VALUES (?, ?);
			`)
			.run('test2.csv', 'test2.csv');

		db.prepare(`
				INSERT INTO metadata (name, path)
				VALUES (?, ?);
			`)
			.run('test3.csv', 'test3.csv');
	};

	const makeRow = (frame: number): CSVData => ({
		Frame: frame,
		CaptureTime: 100 + frame,
		LogTime: 200 + frame,
		HMDPositionX: 0.1,
		HMDPositionY: 0.2,
		HMDPositionz: 0.3,
		HMDRotationX: 0.4,
		HMDRotationY: 0.5,
		HMDRotationZ: 0.6,
		HMDRotationHuh: 0.7,
		GazeStatus: 'VALID',
		CombinedGazeForwardX: 1.1,
		CombinedGazeForwardY: 1.2,
		CombinedGazeForwardZ: 1.3,
		CombinedGazePositionX: 2.1,
		CombinedGazePositionY: 2.2,
		CombinedGazePositionZ: 2.3,
		InterPupillaryDistanceInMM: 60,
		LeftEyeStatus: 'VALID',
		LeftEyeForwardX: 3.1,
		LeftEyeForwardY: 3.2,
		LeftEyeForwardZ: 3.3,
		LeftEyePositionX: 4.1,
		LeftEyePositionY: 4.2,
		LeftEyePositionZ: 4.3,
		LeftPupilIrisDiameterRatio: 0.5,
		LeftPupilDiameterInMM: 4.0,
		LeftIrisDiameterInMM: 6.0,
		LeftEyeOpenness: 0.9,
		RightEyeStatus: 'VALID',
		RightEyeForwardX: 5.1,
		RightEyeForwardY: 5.2,
		RightEyeForwardZ: 5.3,
		RightEyePositionX: 6.1,
		RightEyePositionY: 6.2,
		RightEyePositionZ: 6.3,
		RightPupilIrisDiameterRatio: 0.55,
		RightPupilDiameterInMM: 4.1,
		RightIrisDiameterInMM: 6.1,
		RightEyeOpenness: 0.95,
		FocusDistance: 1.5,
		FocusStability: 0.8
	});

	beforeEach(() => {
		db = getDB({ temporary: true, logging: false });
	});

	afterEach(() => {
		db.close();
	});

	describe('A) Table setup', () => {
		it('A1) Converts filename to a table name with _rows suffix', () => {
			expect(toTableName('ID.011.csv')).toBe('ID_011_csv_rows');
			expect(toTableName('sample.csv')).toBe('sample_csv_rows');
		});

		it('A2) Creates a CSV data table for a given file name', () => {
			const file = { name: 'testa.csv' } as Metadata;

			createCSVTable(db, file.name);

			const table = db.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name=?;
				`)
				.get(toTableName(file.name));

			expect(table).toStrictEqual({ name: toTableName(file.name) });
		});
	});

	describe('B) Table lifecycle', () => {
		it('B1) Creates a CSV table for a given file', () => {
			const filename = 'test.csv';

			createCSVTable(db, filename);

			const table = db.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name=?;
				`)
				.get(toTableName(filename));

			expect(table).toStrictEqual({ name: toTableName(filename) });
		});

		it('B2) Deletes a CSV table for a given file', () => {
			const filename = 'delete_me.csv';

			createCSVTable(db, filename);
			deleteCSVTable(db, filename);

			const table = db.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name=?;
				`)
				.get(toTableName(filename));

			expect(table).toBeUndefined();
		});
	});

	describe('C) CRUD operations', () => {
		it('C1) Creates CSV rows tied to existing metadata', () => {
			seedMetadata();
			const file = db
				.prepare(`SELECT * FROM metadata WHERE name = ?;`)
				.get('test.csv') as Metadata;

			createCSVTable(db, file.name);

			const rows: CSVData[] = [makeRow(1), makeRow(2)];
			const ok = csvActions.create(db, file, rows);

			expect(ok).toBe(true);

			const count = db
				.prepare(`SELECT COUNT(*) as count FROM ${toTableName(file.name)};`)
				.get() as { count: number };

			expect(count.count).toBe(rows.length);
		});

		it('C2) Reads CSV rows for a given file', () => {
			seedMetadata();
			const file = db
				.prepare(`SELECT * FROM metadata WHERE name = ?;`)
				.get('test2.csv') as Metadata;

			createCSVTable(db, file.name);

			const rows: CSVData[] = [makeRow(10), makeRow(11), makeRow(12)];
			csvActions.create(db, file, rows);

			const sql = csvActions.iterate(file);
			const result = db.prepare<[], CSVData>(sql).all();

			expect(result).toHaveLength(rows.length);
			expect(result.map((row) => row.Frame).sort((a, b) => a - b)).toStrictEqual(
				rows.map((row) => row.Frame).sort((a, b) => a - b)
			);
		});

		it('C3) Deletes CSV rows for a given file when resetting cleaning', () => {
			seedMetadata();
			const file = db
				.prepare(`SELECT * FROM metadata WHERE name = ?;`)
				.get('test3.csv') as Metadata;

			createCSVTable(db, file.name);

			const rows: CSVData[] = [makeRow(1), makeRow(2)];
			csvActions.create(db, file, rows);

			deleteCSVTable(db, file.name);
			createCSVTable(db, file.name);

			const table = db.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name=?;
				`)
				.get(toTableName(file.name));

			expect(table).toStrictEqual({ name: toTableName(file.name) });

			const count = db
				.prepare(`SELECT COUNT(*) as count FROM ${toTableName(file.name)};`)
				.get() as { count: number };

			expect(count.count).toBe(0);
		});

		it('C4) Deletes CSV rows for a given file when removing metadata', () => {
			seedMetadata();
			const file = db
				.prepare(`SELECT * FROM metadata WHERE name = ?;`)
				.get('test.csv') as Metadata;

			createCSVTable(db, file.name);

			const rows: CSVData[] = [makeRow(1)];
			csvActions.create(db, file, rows);

			db.prepare(`DELETE FROM metadata WHERE name = ?;`).run(file.name);
			deleteCSVTable(db, file.name);

			const table = db.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name=?;
				`)
				.get(toTableName(file.name));

			expect(table).toBeUndefined();
		});
	});
});