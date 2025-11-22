import { test } from './action_test';

import metadata from './metadata';

function compare(expect, result, expected) {
  expect(result.id).toBe(expected.id);
  expect(result.name).toBe(expected.name);
  expect(result.path).toBe(expected.path);
  expect(result.request_size).toBe(expected.request_size);
  expect(result.completed).toBe(expected.completed);
  expect(result.cleaned).toBe(expected.cleaned);
  expect(result.requested).toBe(expected.requested);
}

// Test creating a file entry in the files table
test.concurrent('files create', async ({ db, expect }) => {
  const expected = {
    id: 4,
    name: 'newData.csv',
    path: '../newData.csv',
    request_size: 2000,
    completed: 0,
    cleaned: 0,
    requested: 0
  };

  const result = metadata.create(db, expected.name, expected.path, expected.request_size);
  expect(result).not.toBeNull();

  compare(expect, result, expected);
});

// Test reading a file entry in the files table
test.concurrent('files read', async ({ db, expect }) => {
  const expected = {
    id: 2,
    name: 'test2.csv',
    path: 'test2.csv',
    request_size: 200,
    completed: 0,
    cleaned: 0,
    requested: 0
  };

  const result = metadata.read(db, 'test2.csv');
  expect(result).not.toBeNull();

  compare(expect, result, expected);
});

// Test updating a file entry in the files table
test.concurrent('files update', async ({ db, expect }) => {
  const expected = {
    id: 2,
    name: 'test2.csv',
    path: 'test2.csv',
    request_size: 200,
    completed: 1,
    cleaned: 200,
    requested: 0
  };

  const original = metadata.read(db, 'test2.csv');
  expect(original).not.toBeNull();

  const success = metadata.update(db, {
    ...original,
    cleaned: original.cleaned + 200,
    completed: 1
  });
  expect(success).toBe(true);

  const updated = metadata.read(db, 'test2.csv');
  expect(updated).not.toBeNull();

  compare(expect, updated, expected);
});

// Test removing a file entry in the files table
test.concurrent('files remove', async ({ db, expect }) => {
  const original = metadata.read(db, 'test2.csv');
  expect(original).not.toBeNull();

  const removed = metadata.remove(db, original);
  expect(removed).not.toBeNull();

  compare(expect, removed, original);

  const file = metadata.read(db, 'test2.csv');
  expect(file).toBeNull();
});
