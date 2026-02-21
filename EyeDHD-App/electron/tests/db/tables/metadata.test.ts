import { describe, it, expect } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import metadataActions, { createMetadataTable, type Metadata } from '../../../db/tables/metadata';

type SeededDb = {
	db: Database;
	cleanup: () => void;
};

function seedMetadataDb(): SeededDb {
	const db = getDB({ temporary: true, logging: false });
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

	return { db, cleanup: () => db.close() };
}

function compareMetadata(result: Metadata, expected: Metadata) {
	expect(result.id).toBe(expected.id);
	expect(result.name).toBe(expected.name);
	expect(result.path).toBe(expected.path);
	expect(result.completed).toBe(expected.completed);
	expect(result.rows).toBe(expected.rows);
}

describe('Database - Metadata', () => {
	describe('A) Table setup', () => {
		it('A1) Creates the metadata table', () => {
			const db = getDB({ temporary: true, logging: false });
			createMetadataTable(db);

			const result = db
				.prepare(`
					SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
				`)
				.get();

			expect(result).toStrictEqual({ name: 'metadata' });
			db.close();
		});
	});

	describe('B) CRUD operations', () => {
		it('B1) Creates a metadata row', () => {
			const { db, cleanup } = seedMetadataDb();

			const expected: Metadata = {
				id: 4,
				name: 'newData.csv',
				path: '../newData.csv',
				header: '',
				completed: 0,
				rows: 0,
				created_at: '',
				updated_at: '',
			};

			const result = metadataActions.create(db, expected.name, expected.path);
			expect(result).not.toBeNull();

			compareMetadata(result as Metadata, expected);
			cleanup();
		});

		it('B2) Reads a metadata row', () => {
			const { db, cleanup } = seedMetadataDb();

			const expected: Metadata = {
				id: 2,
				name: 'test2.csv',
				path: 'test2.csv',
				header: '',
				completed: 0,
				rows: 0,
				created_at: '',
				updated_at: '',
			};

			const result = metadataActions.read(db, 'test2.csv');
			expect(result).not.toBeNull();

			compareMetadata(result as Metadata, expected);
			cleanup();
		});

		it('B3) Updates a metadata row', () => {
			const { db, cleanup } = seedMetadataDb();

			const original = metadataActions.read(db, 'test2.csv');
			const result = metadataActions.update(db, {
				...original,
				header: 'a,b,c',
				completed: 1,
				rows: 42,
			});

			expect(result).not.toBeNull();
			expect(result.header).toBe('a,b,c');

			const expected: Metadata = {
				...original,
				header: 'a,b,c',
				completed: 1,
				rows: 42,
				created_at: '',
				updated_at: '',
			};

			compareMetadata(result as Metadata, expected);
			cleanup();
		});

		it('B4) Removes a metadata row', () => {
			const { db, cleanup } = seedMetadataDb();

			const file = metadataActions.read(db, 'test3.csv');
			const result = metadataActions.remove(db, file);

			expect(result).not.toBeNull();
			compareMetadata(result as Metadata, file);

			expect(() => metadataActions.read(db, 'test3.csv')).toThrow();
			cleanup();
		});
	});
});