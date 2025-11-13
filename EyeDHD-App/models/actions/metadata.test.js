import { test } from "./action_test";

import metadata from "./metadata";

function compare(expect, result, expected) {
	expect(result.id).toBe(expected.id);
	expect(result.name).toBe(expected.name);
	expect(result.path).toBe(expected.path);
	expect(result.buffer_size).toBe(expected.buffer_size);
	expect(result.completed).toBe(expected.completed);
	expect(result.cleaned).toBe(expected.cleaned);
	expect(result.requested).toBe(expected.requested);
}

// Test creating a file entry in the files table
test.concurrent("files create", async ({ db, expect }) => {
	const expected = {
		id: 4,
		name: 'newData.csv',
		path: '../newData.csv',
		buffer_size: 2000,
		completed: 0,
		cleaned: 0,
		requested: 0
	};

	const { ok, file: result } = metadata.create(db,
		expected.name,
		expected.path,
		expected.buffer_size
	);
	expect(ok).toBe(true);
	expect(result).toBeDefined();

	compare(expect, result, expected);
});

// Test reading a file entry in the files table
test.concurrent("files read", async ({ db, expect }) => {
	const expected = {
		id: 2,
		name: 'test2.csv',
		path: 'test2.csv',
		buffer_size: 200,
		completed: 0,
		cleaned: 0,
		requested: 0
	};

	const { ok, file: result } = metadata.read(db, 'test2.csv');

	expect(ok).toBe(true);
	expect(result).toBeDefined();

	compare(expect, result, expected);
});


// Test updating a file entry in the files table
test.concurrent("files update", async ({ db, expect }) => {
	const expected = {
		id: 2,
		name: 'test2.csv',
		path: 'test2.csv',
		buffer_size: 200,
		completed: 1,
		cleaned: 200,
		requested: 0
	};

	const { file: original } = metadata.read(db, 'test2.csv');

	const { ok: changed } = metadata.update(db, {
		...original,
		cleaned: original.cleaned + 200,
		completed: 1
	});
	expect(changed).toBe(true);

	const { ok, file: updated } = metadata.read(db, 'test2.csv');

	expect(ok).toBe(true);
	expect(updated).toBeDefined();

	compare(expect, updated, expected);
});

// Test removing a file entry in the files table
test.concurrent("files remove", async ({ db, expect }) => {
	const { ok, file: original } = metadata.read(db, 'test2.csv');
	expect(ok).toBe(true);
	expect(original).toBeDefined();

	const { ok: deleted, file: removed } = metadata.remove(db, original);

	expect(deleted).toBe(true);
	expect(removed).toBeDefined();

	compare(expect, removed, original);

	const { ok: read, file } = metadata.read(db, 'test2.csv');

	expect(read).toBe(false);
	expect(file).toBeUndefined();
});