import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';

import getDB from '../models/dbmgr.js';
import createMetadataTable from '../models/tables/metadata.js';
import createRowsTable from '../models/tables/csvrows.js';
import metadata from '../models/actions/metadata.js';
import csvrows from '../models/actions/csvrows.js';
import DataCleaner from './stuff/DataCleaner.js';

const appRoot = app.getAppPath();
const dbpath = path.join(appRoot, 'main.db');
const db = getDB({
	path: dbpath
});
createMetadataTable(db);

/**
 * Handles the csv-open-file request. Opens a file selector and begins cleaning it if one is selected
 *
 * @returns filename if a file is selected, or null if none is selected
 */
ipcMain.handle('csv-open-file', async (_, buffer_size) => {
	return new Promise(async (resolve, reject) => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ['openFile'],
			filters: [{ name: 'CSV Files', extensions: ['csv'] }]
		});

		if (canceled) {
			return resolve(null);
		}

		const filepath = filePaths[0];
		const filename = path.basename(filepath);

		// If file is already opened and cleaning, just return filename
		const { ok: exists, file } = metadata.read(db, filename);
		if (exists) {
			if (file.completed === 0) {
				await cleanFile(file);
			}
			return resolve(filename);
		}

		const { ok, file: newFile } = metadata.create(db, filename, filepath, buffer_size);
		if (!ok) {
			return reject(`Failed to create metadata in db for file: ${filename}`);
		}

		createRowsTable(db, newFile.name);

		await cleanFile(newFile);

		return resolve(filename);
	});
});

async function cleanFile(file) {
	// Initialize cleaner
	const cleaner = new DataCleaner({
		path: file.path,
		buf_len: file.buffer_size
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
		return reject(`Failed to clean data for file: ${newFile.name}`, err);
	}
}

ipcMain.handle('csv-reset-file', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
		const { ok: exists, file } = metadata.read(db, filename);
		if (!exists) {
			return reject(`File: ${filename} has not been opened`);
		}

		const { ok: updated } = metadata.update(db, {
			...file,
			requested: 0,
			completed: 0
		});

		if (!updated) {
		    return reject(`Failed to reset file progress for: ${filename}`);
		}

        return resolve();
    });
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 *
 * @TODO update to use database, set completed to true when all rows have been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
		let { ok: exists, file } = metadata.read(db, filename);
		if (!exists) {
			return reject(`File: ${filename} has not been opened`);
		}

		const { ok, rows } = await csvrows.read(db, file);
		if (!ok) {
		    return reject(`Failed to read cleaned rows for file: ${filename}`);
		}

		const { ok: updated } = metadata.update(db, {
			...file,
			requested: file.requested + rows.length
		})
		if (!updated) {
		    return reject(`Failed to update requested count for file: ${filename}`);
		}

        return resolve(rows);
    });
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show();
});
