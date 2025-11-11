import { test } from "./action_test";

import files from "./files";

// Test creating a file entry in the files table
test.concurrent("files create", async ({ db, expect }) => {
    const file = {
        id: 4,
        name: 'newData.csv',
        path: '../newData.csv',
        buffer_size: 2000,
        current: 0,
        started: 0,
        completed: 0,
        rows_cleaned: 0,
        rows_read: 0
    };

    const { ok } = files.create(db, file.name, file.path, file.buffer_size);
    expect(ok).toBe(true);

    const result = db.prepare(`
        SELECT * FROM files WHERE name = ?;
    `).get(file.name);

    expect(result).toBeDefined();
    expect(result.id).toBe(file.id);
    expect(result.name).toBe(file.name);
    expect(result.path).toBe(file.path);
    expect(result.buffer_size).toBe(file.buffer_size);
    expect(result.current).toBe(file.current);
    expect(result.started).toBe(file.started);
    expect(result.completed).toBe(file.completed);
    expect(result.rows_cleaned).toBe(file.rows_cleaned);
    expect(result.rows_read).toBe(file.rows_read);
});

// Test reading a file entry in the files table
test.concurrent("files read", async ({ db, expect }) => {
    const { ok, file } = files.read(db, 'test2.csv');

    expect(ok).toBe(true);
    expect(file).toBeDefined();

    expect(file.id).toBe(2);
    expect(file.name).toBe('test2.csv');
    expect(file.path).toBe('test2.csv');
    expect(file.buffer_size).toBe(200);
    expect(file.current).toBe(0);
    expect(file.started).toBe(0);
    expect(file.completed).toBe(0);
    expect(file.rows_cleaned).toBe(0);
    expect(file.rows_read).toBe(0);
});


// Test updating a file entry in the files table
test.concurrent.todo("files update", async ({ db, expect }) => {
    expect(1 + 1).toBe(2);
});

// Test removing a file entry in the files table
test.concurrent.todo("files remove", async ({ db, expect }) => {
    expect(1 + 1).toBe(2);
});