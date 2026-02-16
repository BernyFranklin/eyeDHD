import { describe, type ExpectStatic, test } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import metadataActions, { createMetadataTable, type Metadata } from '../../../db/tables/metadata';

function compare(expect: ExpectStatic, result: Metadata, expected: Metadata) {
  expect(result.id).toBe(expected.id);
  expect(result.name).toBe(expected.name);
  expect(result.path).toBe(expected.path);
  expect(result.completed).toBe(expected.completed);
  expect(result.rows).toBe(expected.rows);
}

export type Parameters = {
	db: Database;
	expect: ExpectStatic
} & any;

// Adds a testing db with entries added to it for each test
export const metadataTest = test.extend({
	db: async ({}, use: (db: Database) => Promise<void>) => {
    const db = getDB({ temporary: true, logging: false});
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

    await use(db);

    db.close();
  }
});

describe('Database: CSV Metadata', () => {
	test('files table create', async ({ expect }) => {
	  const db = getDB({
	    temporary: true,
	    logging: false
	  });

	  createMetadataTable(db);

	  // Check whether the files database was created
	  const result = db.prepare(`
	      SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
				`)
	    .get();

	  expect(result).toStrictEqual({ name: 'metadata' });
	});

	// Test creating a file entry in the files table
	metadataTest(
	  'files create',
	  async ({ db, expect }: Parameters) => {
	    const expected = {
	      id: 4,
	      name: 'newData.csv',
	      path: '../newData.csv',
	      header: '',
	      completed: 0,
	      rows: 0,
	      created_at: '',
	      updated_at: ''
	    };

	    const result = metadataActions.create(
	    	db,
	      expected.name,
	      expected.path
	    );
	    expect(result).not.toBeNull();

	    compare(expect, result as Metadata, expected);
	  }
	);

	// Test reading a file entry in the files table
	metadataTest(
	  'files read',
	  async ({ db, expect }: Parameters) => {
	    const expected = {
	      id: 2,
	      name: 'test2.csv',
	      path: 'test2.csv',
	      header: '',
	      completed: 0,
	      rows: 0,
	      created_at: '',
	      updated_at: ''
	    };

	    const result = metadataActions.read(db, 'test2.csv');
	    expect(result).not.toBeNull();

	    compare(expect, result as Metadata, expected);
	  }
	);

	// Test updating a file entry in the files table
	metadataTest.todo(
	  'files update',
	  async ({ db, expect }: Parameters) => {
	    const expected = {
	      id: 2,
	      name: 'test2.csv',
	      path: 'test2.csv',
	      header: '',
	      completed: 1,
	      rows: 200,
	      created_at: '',
	      updated_at: ''
	    };

	    const original = metadataActions.read(db, 'test2.csv');
	    expect(original).not.toBeNull();

	    const updated = metadataActions.update(db, {
	      ...original,
	      rows: original.rows + 200,
	      completed: 1
	    });
	    expect(updated).not.toBeNull();

	    compare(expect, updated, expected);
	  }
	);

	// Test removing a file entry in the files table
	metadataTest.todo('files remove', async ({ db, expect }: Parameters) => {
	  const original = metadataActions.read(db, 'test2.csv');
	  expect(original).not.toBeNull();

	  const removed = metadataActions.remove(db, original);
	  expect(removed).not.toBeNull();

	  compare(expect, removed, original);

	  const file = metadataActions.read(db, 'test2.csv');
	  expect(file).toBeNull();
	});
});