import { describe, type ExpectStatic, test } from 'vitest';
import { type Database } from 'better-sqlite3';

import DatabaseManager, { getDB } from '../DatabaseManager';
import metadataActions, { createMetadataTable, type Metadata } from '../tables/metadata';
import csvActions, { createCSVTable, toTableName } from '../tables/csv';
import saccadeActions, { createSaccadeTable, type SaccadeData } from '../tables/saccade';

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

describe('', () => {

});