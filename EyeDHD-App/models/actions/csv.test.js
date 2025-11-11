import { expect , test } from "vitest";

import getDB from "../dbmgr.js";
import csv from "./csv.js";
import files from "./files.js";
import { toTableName } from "../tables/csv.js";

test("csv create", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})

test("csv read", () => {
    const db = getDB(true);

    expect(1 + 1).toBe(2);
})