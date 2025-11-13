import { test } from "vitest";

import getDB from "../dbmgr";
import createMetadataTable from "./metadata";

test.concurrent("files table create", async ({ expect }) => {
	const db = getDB({ testing: true });
	createMetadataTable(db);

	// Check whether the files database was created
	const result = db.prepare(`
		SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';
	`).get();

	expect(result).toStrictEqual({ name: 'metadata' });
});