import toTableName from '../tables/csvrows.js';

export default { create, read };

/**
 * Adds a batch of cleaned CSV rows into the database
 * @param {*} db
 * @param {*} filename
 * @param {*} rows
 * @returns object with ok boolean
 */
function create(db, file, rows) {
	try {
		const insert = db.prepare(`
			INSERT INTO ${toTableName(file.name)} (
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
		console.error(`Failed to read cleaned rows for file: ${file.name}`, err);
		return { ok: false };
	}
}

/**
 * Reads a batch of cleaned CSV rows from the database
 * @param {*} db
 * @param {*} file
 * @returns object with ok boolean and rows array
 */
function read(db, file) {
	try {
		const rows = db.prepare(`
			SELECT * FROM ${toTableName(file.name)}
			OFFSET ${file.requested} ROWS
			FETCH NEXT ${file.buffer_size} ROWS ONLY;
		`).all();

		return { ok: false, rows };
	} catch (err) {
		console.error(`Failed to read cleaned rows for file: ${file.name}`, err);
		return { ok: false, rows: undefined };
	}
}