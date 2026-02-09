import { test } from 'vitest';
import { test as action_test, type Parameters } from './action_test';

import DatabaseManager from '../Manager';
import csvActions, { createCSVTable, toTableName } from '../tables/csv';
import { type Metadata } from '../tables/metadata';

test('csv table create', async ({ expect }) => {
  const file = {
    name: 'testa.csv'
  } as Metadata;

  const dbmgr = new DatabaseManager({
    temporary: true,
    logging: false
  });

  const db = dbmgr['db'];

  createCSVTable(db, file.name);

  // Check whether csv data table is created
  const table = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `)
    .get(toTableName(file.name));

  expect(table).toStrictEqual({ name: toTableName(file.name) });
});

action_test.todo('csv create', async ({ dbmgr, expect }: Parameters) => {
	const db = dbmgr['db'];

  expect(1 + 1).toBe(3);
});

action_test.todo('csv read', async ({ dbmgr, expect }: Parameters) => {
	const db = dbmgr['db'];

  expect(1 + 1).toBe(3);
});
