import { describe, it, expect } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import caseDataActions, { createCaseDataTable, type CaseData } from '../../../db/tables/CaseData';

type SeededDb = {
	db: Database;
	cleanup: () => void;
};

function seedCaseDataDb(): SeededDb {
	const db = getDB({ temporary: true, logging: false });
	createCaseDataTable(db);

	db.prepare(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run('test.csv', 'test.csv');

	db.prepare(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run('test2.csv', 'test2.csv');

	db.prepare(`
			INSERT INTO CaseData (name, path)
			VALUES (?, ?);
		`)
		.run('test3.csv', 'test3.csv');

	return { db, cleanup: () => db.close() };
}

function compareMetadata(result: CaseData, expected: CaseData) {
	expect(result.id).toBe(expected.id);
	expect(result.name).toBe(expected.name);
	expect(result.path).toBe(expected.path);
	expect(result.tasks).toEqual(expected.tasks);
	expect(result.cleaned_rows).toBe(expected.cleaned_rows);
}

describe('Database - CaseData', () => {
	describe('A) Table setup', () => {
		it('A1) Creates the CaseData table', () => {
			const db = getDB({ temporary: true, logging: false });
			createCaseDataTable(db);

			const result = db
				.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name='CaseData';
				`)
				.get();

			expect(result).toStrictEqual({ name: 'CaseData' });
			db.close();
		});
	});

	describe('B) CRUD operations', () => {
		it('B1) Creates a CaseData row', () => {
			const { db, cleanup } = seedCaseDataDb();

			const expected: CaseData = {
				id: 4,
				name: 'newData.csv',
				path: '../newData.csv',
				header: '',
				tasks: {
					cleaning: false,
					detection: false,
					pupil: false,
					animation: false
				},
				cleaned_rows: 0,
				created_at: '',
				updated_at: '',
			};

			const result = caseDataActions.create(db, expected.name, expected.path);
			expect(result).not.toBeNull();

			compareMetadata(result as CaseData, expected);
			cleanup();
		});

		it('B2) Reads a CaseData row', () => {
			const { db, cleanup } = seedCaseDataDb();

			const expected: CaseData = {
				id: 2,
				name: 'test2.csv',
				path: 'test2.csv',
				header: '',
				tasks: {
					cleaning: false,
					detection: false,
					pupil: false,
					animation: false
				},
				cleaned_rows: 0,
				created_at: '',
				updated_at: '',
			};

			const result = caseDataActions.read(db, 'test2.csv');
			expect(result).not.toBeNull();

			compareMetadata(result as CaseData, expected);
			cleanup();
		});

		it('B3) Updates a CaseData row', () => {
			const { db, cleanup } = seedCaseDataDb();

			const original = caseDataActions.read(db, 'test2.csv');
			const result = caseDataActions.update(db, original, {
				header: 'a,b,c',
				tasks: { cleaning: true },
				cleaned_rows: 42,
			});

			expect(result).not.toBeNull();
			expect(result.header).toBe('a,b,c');

			const expected: CaseData = {
				...original,
				header: 'a,b,c',
				tasks: { ...original.tasks, cleaning: true },
				cleaned_rows: 42,
				created_at: '',
				updated_at: '',
			};

			compareMetadata(result as CaseData, expected);
			cleanup();
		});

		it('B4) Removes a CaseData row', () => {
			const { db, cleanup } = seedCaseDataDb();

			const file = caseDataActions.read(db, 'test3.csv');
			const result = caseDataActions.remove(db, file);

			expect(result).not.toBeNull();
			compareMetadata(result as CaseData, file);

			expect(() => caseDataActions.read(db, 'test3.csv')).toThrow();
			cleanup();
		});
	});
});