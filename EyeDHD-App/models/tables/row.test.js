import { test } from 'vitest';

import getDB from '../dbmgr';
import { createRowTable, toTableName } from './row';

test.concurrent('csv table create', async ({ expect }) => {
  const file = {
    name: 'test.csv'
  };

  const db = getDB({ testing: true });
  createRowTable(db, file.name);

  // Check whether csv data table is created
  const table = db
    .prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `)
    .get(toTableName(file.name));

  expect(table).toStrictEqual({ name: toTableName(file.name) });
});
