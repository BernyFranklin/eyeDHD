import { test } from 'vitest';

import DatabaseManager from '../DatabaseManager';
import { createMetadataTable } from './metadata.ts';

test.concurrent('files table create', async ({ expect }) => {
  const dbmgr = new DatabaseManager({
    temporary: true,
    logging: true
  });
  dbmgr.init();

  createMetadataTable(dbmgr.db);

  // Check whether the files database was created
  const result = dbmgr.db
    .prepare(
      `
      SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
		`
    )
    .get();

  expect(result).toStrictEqual({ name: 'metadata' });
});
