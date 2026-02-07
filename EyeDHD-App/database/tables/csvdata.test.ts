import { test } from 'vitest';
import { test as action_test } from './action_test';

import DatabaseManager from '../Manager';
import { createRowTable, toTableName } from './csvdata';

import metadataActions from './metadata';
import rowsActions from './csvdata';

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

action_test.concurrent.todo('csv create', async ({ db, expect }) => {
  expect(1 + 1).toBe(3);
});

action_test.concurrent.todo('csv read', async ({ db, expect }) => {
  expect(1 + 1).toBe(3);
});
