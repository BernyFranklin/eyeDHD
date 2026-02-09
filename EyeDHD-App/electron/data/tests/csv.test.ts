import { test } from 'vitest';
import { test as action_test, type Parameters } from './action_test';

import { getDB } from '../Manager';
import csvActions, { createCSVTable, toTableName } from '../tables/csv';
import { type Metadata } from '../tables/metadata';

test('csv table create', async ({ expect }) => {
  const file = {
    name: 'testa.csv'
  } as Metadata;

  const db = getDB({
    temporary: true,
    logging: false
  });

  createCSVTable(db, file.name);

  // Check whether csv data table is created
  const table = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name=?;
    `)
    .get(toTableName(file.name));

  expect(table).toStrictEqual({ name: toTableName(file.name) });
});

action_test.todo('csv create', async ({ db, expect }: Parameters) => {
  expect(1 + 1).toBe(3);
});

action_test.todo('csv read', async ({ db, expect }: Parameters) => {
  expect(1 + 1).toBe(3);
});
