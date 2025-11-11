import { expect , test } from "vitest";

import getDB from "../../models/dbmgr.js";
import files from "../../models/actions/files.js";
import { toTableName } from "../../models/tables/csv.js";
import csv from "../../models/actions/csv.js";

// Test opening the database file, and it's initialization
test("database initialization", () => {
    const db = getDB(true);

    // Check whether the files database was created
    const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='files';
    `).get();

    expect(result).toStrictEqual({ name: 'files' });
})

// Test creating a file entry in the files table
test("files create", () => {
    const file = {
        id: 1,
        name: 'test.csv',
        path: '../test.csv',
        buffer_size: 200,
        current: 0,
        started: 0,
        completed: 0,
        rows_cleaned: 0,
        rows_read: 0
    };

    const db = getDB(true);
    const { ok } = files.create(db, file.name, file.path, file.buffer_size);
    if (!ok) {
        throw new Error("Failed to create file entry in database");
    }

    // Check whether csv data table is created
    const table = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='${toTableName(file.name)}';
    `).get();

    expect(table).toStrictEqual({ name: toTableName(file.name) });

    const result = db.prepare(`
        SELECT * FROM files WHERE name = ?;
    `).get(file.name);

    expect(result.id).toBe(file.id);
    expect(result.name).toBe(file.name);
    expect(result.path).toBe(file.path);
    expect(result.buffer_size).toBe(file.buffer_size);
    expect(result.current).toBe(file.current);
    expect(result.started).toBe(file.started);
    expect(result.completed).toBe(file.completed);
    expect(result.rows_cleaned).toBe(file.rows_cleaned);
    expect(result.rows_read).toBe(file.rows_read);
})

// Test reading a file entry in the files table
test("files read", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})


// Test updating a file entry in the files table
test("files update", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})

// Test removing a file entry in the files table
test("files remove", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})

test("csv create", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})

test("csv read", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})