import { parentPort, workerData } from 'worker_threads';

import getDB from '../models/dbmgr.js';
import files from '../models/actions/files.js';
import csv from '../models/actions/csv.js';
import DataCleaner from '../models/datacleaner.js';

const db = getDB();

// Loads CSV data into the database using a DataCleaner
async function loadCsv(db, filename, filepath, buffer_size) {
	const cleaner = new DataCleaner({
		path: filepath,
		buf_len: buffer_size
	});

	try {
		let buffer = await cleaner.getBuffer();

		while (buffer) {
			const { ok } = csv.create(db, filename, buffer);
			if (!ok) {
				return { ok: false, err: `Failed to clean data for file: ${filename}` };
			}

			// Update file metadata

			buffer = await cleaner.getBuffer();
		}

		// Update file metadata

		cleaner.close();
		return { ok: true, err: undefined };
	} catch (err) {
		return { ok: false, err: `Failed to clean data for file: ${filename}` };
	}

}

const { ok, err } = await loadCsv(db, ...workerData);
if (!ok) {
	parentPort.postMessage({ ok: false, err });
}