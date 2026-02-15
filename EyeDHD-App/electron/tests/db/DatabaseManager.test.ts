import { describe, type ExpectStatic, test } from 'vitest';
import { type Database } from 'better-sqlite3';

import DatabaseManager, { getDB } from '../../db/DatabaseManager';
import metadataActions, { createMetadataTable, type Metadata } from '../../db/tables/metadata';
import csvActions, { createCSVTable, toTableName } from '../../db/tables/csv';
import saccadeActions, { createSaccadeTable, type SaccadeData } from '../../db/tables/saccade';

export type Parameters = {
	db: Database;
	expect: ExpectStatic
} & any;

// Adds a testing db with entries added to it for each test
export const dbManagerTest = test.extend({
	db: async ({}, use: (db: Database) => Promise<void>) => {
    const db = getDB({ temporary: true, logging: false});
    createMetadataTable(db);

    // Set up DatabaseManager instance instead of db
    // and get db using const db = dbmgr['db'];

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

    await use(db);

    db.close();
  }
});

describe('Database: DatabaseManager', () => {
	test('1) initialization', ({ expect }) => {

	});

	dbManagerTest('2) openFile', async ({ db, expect }) => {
		test('2a) new file metadata initialized properly', () => {

		});

		test('2b) new file cleaner initalized properly', () => {

		});
		
		test('2a) old file metadata  properly', () => {

		});

		test('2b) new file cleaner initalized properly', () => {

		});
	});

	dbManagerTest('3) Metadata', ({ db, expect }) => {
		test('3a) create', () => {

		});

		test('3a) read', () => {

		});

		test('3a) update', () => {

		});

		test('3a) remove', () => {

		});
	});
});