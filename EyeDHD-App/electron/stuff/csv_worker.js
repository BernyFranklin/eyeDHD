import { parentPort, workerData } from 'worker_threads';

import getDB from '../models/dbmgr.js';
import createMetadataTable from '../models/tables/metadata.js';
import metadata from '../models/actions/metadata,js';
import csvrows from '../models/actions/csvrows.js';
import DataCleaner from '../models/datacleaner.js';

async function cleanFile(file) {
	const db = getDB();
	createMetadataTable(db);

	// Initialize cleaner
	const cleaner = new DataCleaner({
		path: file.path,
		buf_len: file.buffer_size * 10
	});

	try {
		// Load first batch of rows then loop until file has been cleaned
		let buffer = await cleaner.getBuffer();

		while (buffer) {
			// Store rows
			let { ok: stored } = csvrows.create(db, file, buffer);
			if (!stored) {
				throw new Error(`Failed to store rows for file: ${file.name}`);
			}

			// Update file metadata
			const { ok: updated } = metadata.update(db, {
				...file,
				cleaned: file.cleaned + buffer.length
			});
			if (!updated) {
				throw new Error(`Failed to update metadata for file: ${file.name}`);
			}

			// Fetch new file metadata
			const { ok: read, file: newFile } = metadata.read(db, file.name);
			if (read) file = newFile;

			// Yield before loading more so ui can request data
			await sleep(10);
			buffer = await cleaner.getBuffer();
		}

		// Update file metadata to show cleaning has completed
		const { ok: updated } = metadata.update(db, {
			...file,
			completed: 1
		});
		if (!updated) {
			throw new Error(`Failed to update metadata for file: ${file.name}`);
		}

		cleaner.close();
	} catch (err) {
		return { ok: false, err: new Error(`Failed to clean data for file: ${file.name}: `, err) };
	}
}

const { ok, err } = await cleanFile(...workerData);
if (!ok) {
	parentPort.postMessage({ ok: false, err });
}