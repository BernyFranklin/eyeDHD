import { describe, type ExpectStatic, test } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import csvActions, { createCSVTable, toTableName } from '../../../db/tables/csv';
import { createMetadataTable, type Metadata } from '../../../db/tables/metadata';

export type Parameters = {
	db: Database;
	expect: ExpectStatic
} & any;

// Adds a testing db with entries added to it for each test
export const csvTest = test.extend({
	db: async ({}, use: (db: Database) => Promise<void>) => {
    const db = getDB({ temporary: true, logging: false});
    createMetadataTable(db);

    db.prepare(`
    		INSERT INTO metadata (name, path, request_size)
      	VALUES (?, ?, ?);
			`)
      .run('test.csv', 'test.csv', 200);

    db.prepare(`
    		INSERT INTO metadata (name, path, request_size)
				VALUES (?, ?, ?);
			`)
      .run('test2.csv', 'test2.csv', 200);

    db.prepare(`
    		INSERT INTO metadata (name, path, request_size)
				VALUES (?, ?, ?);
			`)
      .run('test3.csv', 'test3.csv', 200);

    // Insert test csv data tables and entries relating to metadatas above

    await use(db);

    db.close();
  }
});

describe('Database: CSV Data', () => {
	test('csv table create', async ({ expect }) => {
	  const file = {
	    name: 'testa.csv'
	  } as Metadata;

	  const db = getDB({
	    temporary: true,
	    logging: false
	  });

	  createCSVTable(db, file.name);

	  // Check whether csv data table is created
	  const table = db.prepare(`
	      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
	    `)
	    .get(toTableName(file.name));

	  expect(table).toStrictEqual({ name: toTableName(file.name) });
	});

	csvTest.todo('csv create', async ({ db, expect }: Parameters) => {
	  expect(1 + 1).toBe(3);
	});

	csvTest.todo('csv read', async ({ db, expect }: Parameters) => {
	  expect(1 + 1).toBe(3);
	});
})
