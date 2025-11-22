import { test } from './action_test';

import metadata from './metadata';
import csvrows from './csvrows';
import { toTableName } from '../tables/csvrows';

test.concurrent.todo('csv create', async ({ db, expect }) => {
  expect(1 + 1).toBe(2);
});

test.concurrent.todo('csv read', async ({ db, expect }) => {
  expect(1 + 1).toBe(2);
});
