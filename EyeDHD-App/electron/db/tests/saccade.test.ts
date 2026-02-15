import { describe, type ExpectStatic, test } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../DatabaseManager';
import saccadeActions, { createSaccadeTable, type SaccadeData } from '../tables/saccade';
import { createMetadataTable, type Metadata } from '../tables/metadata';

export type Parameters = {
	db: Database;
	expect: ExpectStatic
} & any;

// Adds a testing db with entries added to it for each test
export const saccadeTest = test.extend({
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

    // Insert test saccade data tables and entries relating to metadatas above

    await use(db);

    db.close();
  }
});

describe('', () => {

});