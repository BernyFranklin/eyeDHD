import { test } from 'vitest';
import { test as action_test } from './action_test';

import DatabaseManager from '../Manager';
import rowActions, { createRowTable, toTableName } from '../tables/csv';
import metadataActions, { type Metadata } from '../tables/metadata';
import saccadeActions from '../tables/saccade';

test('csv table create', async ({ expect }) => {
  const file = {
    name: 'test.csv'
  } as Metadata;

  const dbmgr = new DatabaseManager({
    temporary: true,
    logging: false
  });

  dbmgr.createCSVTable(file);

  // Check whether csv data table is created
  const table = dbmgr.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `)
    .get(toTableName(file.name));

  expect(table).toStrictEqual({ name: toTableName(file.name) });
});

action_test.todo('csv create', async ({ dbmgr, expect }) => {
  expect(1 + 1).toBe(3);
});

action_test.todo('csv read', async ({ dbmgr, expect }) => {
  expect(1 + 1).toBe(3);
});
