import { toTableName } from '../tables/csvrows.js';

export default { create, read, firstAndLast };

function create(db, file, rows) {
	try {
		const table = toTableName(file.name);
		const insert = db.prepare(`
			INSERT INTO ${table} (
				Frame,
				CaptureTime,
				LogTime,
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
				@CaptureTime,
				@LogTime,
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

		return true;
	} catch (err) {
		console.error(err);

		return false;
	}
}

function read(db, file) {
	try {
		const table = toTableName(file.name);
		let rows = db.prepare(`
			SELECT * FROM ${table}
			LIMIT ? OFFSET ?;
		`).all(file.buffer_size, file.requested);

		return rows;
	} catch (err) {
		console.error(err);

		return undefined;
	}
}

function firstAndLast(db, file) {
	try {
		const table = toTableName(file.name);

		const first = db.prepare(`
			SELECT * FROM ${table}
			WHERE frame = ?;
		`).get(file.first_frame);

		const last = db.prepare(`
			SELECT * FROM ${table}
			WHERE frame = ?;
		`).get(file.last_frame);

		return { first, last };
	} catch (err) {
		console.error(err);

		return null;
	}
}
