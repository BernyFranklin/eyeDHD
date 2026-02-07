import { test } from 'vitest';

import DatabaseManager from '../DatabaseManager';
import { createRowTable, toTableName } from './csvrow';

test.concurrent('csv table create', async ({ expect }) => {
  const file = {
    name: 'test.csv'
  };

  const dbmgr = new DatabaseManager({
    temporary: true,
    logging: true
  });
  dbmgr.init();

  createRowTable(dbmgr.db, file.name);

  // Check whether csv data table is created
  const table = dbmgr.db
    .prepare(
      `
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `
    )
    .get(toTableName(file.name));

  expect(table).toStrictEqual({ name: toTableName(file.name) });
});
