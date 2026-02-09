import { test as vitest } from 'vitest';

import DatabaseManager from '../Manager';
import { createMetadataTable } from './metadata';

// Adds a testing db with entries added to it for each test
export const test = vitest.extend({
  db: async ({}, use: any) => {
    console.log('Setting up test database...');

    const dbmgr = new DatabaseManager({ temporary: true, logging: true });
    createMetadataTable(dbmgr.db);

    dbmgr.prepare(`
    		INSERT INTO metadata (name, path, request_size)
      	VALUES (?, ?, ?);
			`)
      .run('test.csv', 'test.csv', 200);

    dbmgr.prepare(`
    		INSERT INTO metadata (name, path, request_size)
				VALUES (?, ?, ?);
			`)
      .run('test2.csv', 'test2.csv', 200);

    dbmgr.prepare(`
    		INSERT INTO metadata (name, path, request_size)
				VALUES (?, ?, ?);
			`)
      .run('test3.csv', 'test3.csv', 200);

    console.log('Setting up test database complete.');

    await use(dbmgr.db);

    dbmgr.db.close();
  }
});
