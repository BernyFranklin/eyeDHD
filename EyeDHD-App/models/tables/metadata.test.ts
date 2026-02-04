import { test } from 'vitest';

import getDB from '../dbmgr.ts';
import { createMetadataTable } from './metadata.ts';

test.concurrent('files table create', async ({ expect }) => {
  const db = getDB({ temporary: true, logging: true });
  createMetadataTable(db);

  // Check whether the files database was created
  const result = db
    .prepare(
      `
      SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
		`
    )
    .get();

  expect(result).toStrictEqual({ name: 'metadata' });
});
