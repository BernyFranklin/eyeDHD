import { test } from "./action_test";

import metadata from "./metadata";
import rows from "./rows";
import { toTableName } from "../tables/rows";

test.concurrent.todo("csv create", async ({ db, expect }) => {
	expect(1 + 1).toBe(2);
});

test.concurrent.todo("csv read", async ({ db, expect }) => {
	expect(1 + 1).toBe(2);
});