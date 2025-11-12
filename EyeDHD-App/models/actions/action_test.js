import { test as vitest } from "vitest";

import getDB from "../dbmgr";
import createMetadataTable from "../tables/metadata";

// Adds a testing db with entries added to it for each test
export const test = vitest.extend({
	db: async ({}, use) => {
		console.log("Setting up test database...");

		const db = getDB(true);
		createMetadataTable(db);

		db.prepare(`
			INSERT INTO metadata (name, path, buffer_size)
			VALUES (?, ?, ?);
		`).run('test.csv', 'test.csv', 200);

		db.prepare(`
			INSERT INTO metadata (name, path, buffer_size)
			VALUES (?, ?, ?);
		`).run('test2.csv', 'test2.csv', 200);

		db.prepare(`
			INSERT INTO metadata (name, path, buffer_size)
			VALUES (?, ?, ?);
		`).run('test3.csv', 'test3.csv', 200);

		console.log("Setting up test database complete.");

		await use(db);

		db.close();
	}
});