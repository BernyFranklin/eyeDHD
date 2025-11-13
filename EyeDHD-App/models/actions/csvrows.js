import { toTableName } from '../tables/csvrows.js';
import { sleep } from '../../electron/utils.js';

export default { create, read };

/**
 * Adds a batch of cleaned CSV rows into the database
 * @param {*} db
 * @param {*} file
 * @param {*} rows
 * @returns object with ok boolean
 */
function create(db, file, rows) {
	try {
		const table = toTableName(file.name);
		const insert = db.prepare(`
			INSERT INTO ${table} (
				Frame,
				LeftEyeStatus,
				LeftEyeForwardX,
				LeftEyeForwardY,
				LeftEyeForwardZ,
				RightEyeStatus,
				RightEyeForwardX,
				RightEyeForwardY,
				RightEyeForwardZ
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
		console.error(`Failed to store cleaned rows for file: ${file.name}`, err);
		return { ok: false };
	}
}

/**
 * Reads a batch of cleaned CSV rows from the database
 * @param {*} db
 * @param {*} file
 * @returns object with ok boolean and rows array
 */
async function read(db, file) {
	try {
		if (file.cleaned === 0) {
			await sleep(100);
		}

		const table = toTableName(file.name);
		let rows = db.prepare(`
			SELECT * FROM ${table}
			LIMIT ? OFFSET ?;
		`).all(file.buffer_size, file.requested);

		return { ok: true, rows };
	} catch (err) {
		console.error(`Failed to read cleaned rows for file: ${file.name}`, err);
		return { ok: false, rows: undefined };
	}
}