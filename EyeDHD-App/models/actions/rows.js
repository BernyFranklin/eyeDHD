import path from 'path';

import toTableName from '../tables/rows';
import files from './metadata';

export default { create, read };

/**
 * Adds new cleaned CSV rows in the database
 * @param {*} db
 * @param {*} filename
 * @param {*} rows
 * @returns object with ok boolean
 */
function create(db, filename, rows) {
	try {
		const insert = db.prepare(`
			INSERT INTO ${toTableName(filename)} (
				Frame,
				LeftEyeStatus,
				LeftEyeForwardX,
				LeftEyeForwardY,
				LeftEyeForwardZ,
				RightEyeStatus,
				LeftEyeForwardX,
				LeftEyeForwardY,
				LeftEyeForwardZ
			)
			VALUES (
				@Frame,
				@LeftEyeStatus,
				@LeftEyeForwardX,
				@LeftEyeForwardY,
				@LeftEyeForwardZ,
				@RightEyeStatus,
				@RightEyeForwardX,
				@RightEyeForwardY,
				@RightEyeForwardZ
			);
		`);

		const insertMany = db.transaction((rows) => {
			for (const row of rows) {
				insert.run(row);
			}
		});

		insertMany(rows);

		return { ok: true };
	} catch (err) {
		return { ok: false };
	}
}

/**
 * Reads cleaned CSV rows from the database
 * @param {*} db
 * @param {*} file
 * @returns object with ok boolean and rows array
 */
function read(db, file) {
	try {
		const rows = db.prepare(`
			SELECT * FROM ${toTableName(file.name)}
			OFFSET ${file.rows_read} ROWS
			FETCH NEXT ${file.buffer_size} ROWS ONLY;
		`).all();

		// Update file metadata

		return { ok: false, rows };
	} catch (err) {
		console.error(`Failed to read cleaned rows for file: ${file.name}`, err);
		return { ok: false, rows: undefined };
	}
}