import { test } from 'vitest';
import { test as action_test } from './action_test';

import type { Database } from 'better-sqlite3';

import DatabaseManager from '../DatabaseManager';
import metadataActions, { type Metadata, createMetadataTable } from './metadata.ts';

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

function compare(expect: any, result: Metadata, expected: Metadata) {
  expect(result.id).toBe(expected.id);
  expect(result.name).toBe(expected.name);
  expect(result.path).toBe(expected.path);
  expect(result.request_size).toBe(expected.request_size);
  expect(result.completed).toBe(expected.completed);
  expect(result.cleaned).toBe(expected.cleaned);
  expect(result.requested).toBe(expected.requested);
}

// Test creating a file entry in the files table
action_test.concurrent(
  'files create',
  async ({ db, expect }: { db: Database; expect: any }) => {
    const expected = {
      id: 4,
      name: 'newData.csv',
      path: '../newData.csv',
      request_size: 2000,
      header: '',
      completed: 0,
      cleaned: 0,
      requested: 0,
      first_frame: 0,
      last_frame: 0,
      created_at: '',
      updated_at: ''
    };

    const result = metadataActions.create(
      db,
      expected.name,
      expected.path,
      expected.request_size
    );
    expect(result).not.toBeNull();

    compare(expect, result as Metadata, expected);
  }
);

// Test reading a file entry in the files table
action_test.concurrent(
  'files read',
  async ({ db, expect }: { db: Database; expect: any }) => {
    const expected = {
      id: 2,
      name: 'test2.csv',
      path: 'test2.csv',
      request_size: 200,
      header: '',
      completed: 0,
      cleaned: 0,
      requested: 0,
      first_frame: 0,
      last_frame: 0,
      created_at: '',
      updated_at: ''
    };

    const result = metadataActions.read(db, 'test2.csv');
    expect(result).not.toBeNull();

    compare(expect, result as Metadata, expected);
  }
);

// Test updating a file entry in the files table
// action_test.concurrent(
//   'files update',
//   async ({ db, expect }: { db: Database; expect: any }) => {
//     const expected = {
//       id: 2,
//       name: 'test2.csv',
//       path: 'test2.csv',
//       request_size: 200,
//       header: '',
//       completed: 1,
//       cleaned: 200,
//       requested: 0,
//       first_frame: 0,
//       last_frame: 0,
//       created_at: '',
//       updated_at: ''
//     };

//     const original = metadataActions.read(db, 'test2.csv');
//     expect(original).not.toBeNull();

//     const success = metadataActions.update(db, {
//       ...original,
//       cleaned: original.cleaned + 200,
//       completed: 1
//     });
//     expect(success).toBe(true);

//     const updated = metadataActions.read(db, 'test2.csv');
//     expect(updated).not.toBeNull();

//     compare(expect, updated, expected);
//   }
// );

// // Test removing a file entry in the files table
// test.concurrent('files remove', async ({ db, expect }: { db: Database; expect: any }) => {
//   const original = metadataActions.read(db, 'test2.csv');
//   expect(original).not.toBeNull();

//   const removed = metadataActions.remove(db, original);
//   expect(removed).not.toBeNull();

//   compare(expect, removed, original);

//   const file = metadataActions.read(db, 'test2.csv');
//   expect(file).toBeNull();
// });
