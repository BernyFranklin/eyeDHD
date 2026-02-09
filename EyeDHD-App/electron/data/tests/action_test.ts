import { test as vitest } from 'vitest';

import DatabaseManager from '../Manager';
import { createMetadataTable } from '../tables/metadata';

// Adds a testing db with entries added to it for each test
export const test = vitest.extend({
  dbmgr: async ({}, use: any) => {
    const dbmgr = new DatabaseManager({ temporary: true, logging: false });
    dbmgr.createMetadataTable();

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

    await use(dbmgr);

    dbmgr.close();
  }
});
