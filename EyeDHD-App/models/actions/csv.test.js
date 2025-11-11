import { test } from "./action_test";

import csv from "./csv";
import files from "./files";
import { toTableName } from "../tables/csv";

test.concurrent.todo("csv create", async ({ db, expect }) => {
	expect(1 + 1).toBe(2);
});

test.concurrent.todo("csv read", async ({ db, expect }) => {
	expect(1 + 1).toBe(2);
});