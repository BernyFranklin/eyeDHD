import { ExpectStatic, test } from 'vitest';
import { test as action_test, type Parameters } from './action_test';

import { getDB } from '../Manager';
import metadataActions, { createMetadataTable, type Metadata } from '../tables/metadata';

test('files table create', async ({ expect }) => {
  const db = getDB({
    temporary: true,
    logging: false
  });

  createMetadataTable(db);

  // Check whether the files database was created
  const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
		`)
    .get();

  expect(result).toStrictEqual({ name: 'metadata' });
});

function compare(expect: ExpectStatic, result: Metadata, expected: Metadata) {
  expect(result.id).toBe(expected.id);
  expect(result.name).toBe(expected.name);
  expect(result.path).toBe(expected.path);
  expect(result.request_size).toBe(expected.request_size);
  expect(result.completed).toBe(expected.completed);
  expect(result.cleaned).toBe(expected.cleaned);
  expect(result.requested).toBe(expected.requested);
}

// Test creating a file entry in the files table
action_test(
  'files create',
  async ({ db, expect }: Parameters) => {
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
      expected.path
    );
    expect(result).not.toBeNull();

    compare(expect, result as Metadata, expected);
  }
);

// Test reading a file entry in the files table
action_test(
  'files read',
  async ({ db, expect }: Parameters) => {
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
// action_test(
//   'files update',
//   async ({ db, expect }: Parameters) => {
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
// action_test('files remove', async ({ db, expect }: Parameters) => {
//   const original = metadataActions.read(db, 'test2.csv');
//   expect(original).not.toBeNull();

//   const removed = metadataActions.remove(db, original);
//   expect(removed).not.toBeNull();

//   compare(expect, removed, original);

//   const file = metadataActions.read(db, 'test2.csv');
//   expect(file).toBeNull();
// });
