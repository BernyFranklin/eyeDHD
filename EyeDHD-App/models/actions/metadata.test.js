import { test } from "./action_test";

import metadata from "./metadata";

// Test creating a file entry in the files table
test.concurrent("files create", async ({ db, expect }) => {
	const file = {
		id: 4,
		name: 'newData.csv',
		path: '../newData.csv',
		buffer_size: 2000,
		completed: 0,
		cleaned: 0,
		requested: 0
	};

	const { ok } = metadata.create(db, file.name, file.path, file.buffer_size);
	expect(ok).toBe(true);

	const result = db.prepare(`
		SELECT * FROM metadata WHERE name = ?;
	`).get(file.name);

	expect(result).toBeDefined();
	expect(result.id).toBe(file.id);
	expect(result.name).toBe(file.name);
	expect(result.path).toBe(file.path);
	expect(result.buffer_size).toBe(file.buffer_size);
	expect(result.completed).toBe(file.completed);
	expect(result.cleaned).toBe(file.cleaned);
	expect(result.requested).toBe(file.requested);
});

// Test reading a file entry in the files table
test.concurrent("files read", async ({ db, expect }) => {
	const { ok, file } = metadata.read(db, 'test2.csv');

	expect(ok).toBe(true);
	expect(file).toBeDefined();

	expect(file.id).toBe(2);
	expect(file.name).toBe('test2.csv');
	expect(file.path).toBe('test2.csv');
	expect(file.buffer_size).toBe(200);
	expect(file.completed).toBe(0);
	expect(file.cleaned).toBe(0);
	expect(file.requested).toBe(0);
});


// Test updating a file entry in the files table
test.concurrent("files update", async ({ db, expect }) => {
	const { file } = metadata.read(db, 'test2.csv');

	metadata.update(db, {
		...file,
		cleaned: file.cleaned + 200,
		completed: 1
	});

	const { ok, file: updated } = metadata.read(db, 'test2.csv');

	expect(ok).toBe(true);
	expect(updated).toBeDefined();

	expect(updated.id).toBe(2);
	expect(updated.name).toBe('test2.csv');
	expect(updated.path).toBe('test2.csv');
	expect(updated.buffer_size).toBe(200);
	expect(updated.completed).toBe(1);
	expect(updated.cleaned).toBe(200);
	expect(updated.requested).toBe(0);
});

// Test removing a file entry in the files table
test.concurrent("files remove", async ({ db, expect }) => {
	const { ok, file: removed } = metadata.remove(db, 'test2.csv');

	expect(ok).toBe(true);
	expect(removed).toBeDefined();

	expect(removed.id).toBe(2);
	expect(removed.name).toBe('test2.csv');
	expect(removed.path).toBe('test2.csv');
	expect(removed.buffer_size).toBe(200);
	expect(removed.completed).toBe(0);
	expect(removed.cleaned).toBe(0);
	expect(removed.requested).toBe(0);

	const { ok: readOk, file } = metadata.read(db, 'test2.csv');

	expect(readOk).toBe(false);
	expect(file).toBeUndefined();
});