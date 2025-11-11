import { expect , test } from "vitest";

import getDB from "./dbmgr.js";

// Test opening the database file, and it's initialization
test("database initialization", () => {
    const db = getDB(true);

    // Check whether the files database was created
    const result = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='files';
    `).get();

    expect(result).toStrictEqual({ name: 'files' });
})