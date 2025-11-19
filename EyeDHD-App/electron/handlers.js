import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';

import getDB from '../models/dbmgr.js';
import createMetadataTable from '../models/tables/metadata.js';
import createRowsTable from '../models/tables/csvrows.js';
import metadata from '../models/actions/metadata.js';
import csvrows from '../models/actions/csvrows.js';
import DataCleaner from './stuff/DataCleaner.js';

/*
 * Database setup
 * Set testing to true to use a temporary db instead of a file
 */
const appRoot = app.getAppPath();
const dbpath = path.join(appRoot, 'main.db');
const db = getDB({
	path: dbpath,
	testing: false
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
		let file = metadata.read(db, filename);
		if (file) {
			if (file.completed === 0) {
				await cleanFile(file);
			}

			const updated = metadata.update(db, { ...file,
				requested: 0
			});
			if (!updated) {
			    return reject(`Failed to reset file progress for: ${filename}`);
			}

			return resolve(filename);
		}

		file = metadata.create(db, filename, filepath, buffer_size);
		if (!file) {
			return reject(`Failed to create metadata in db for file: ${filename}`);
		}

		createRowsTable(db, file.name);

		await cleanFile(file);

		return resolve(filename);
	});
});

function cleanFile(original) {
	return new Promise(async (resolve, reject) => {
		let file = original;
		// Initialize cleaner
		const cleaner = new DataCleaner({
			path: file.path,
			buf_len: file.buffer_size
		});

		// Load first batch of rows then loop until file has been cleaned
		let buffer = await cleaner.getBuffer();

		file.first_frame = buffer[0].Frame;
		const ok = metadata.update(db, file);
		if (!ok) {
			return reject(`Failed to update metadata for file: ${file.name}`);
		}

		while (buffer) {
			// Store rows
			let stored = csvrows.create(db, file, buffer);
			if (!stored) {
				return reject(`Failed to store rows for file: ${file.name}`);
			}

			// Update file metadata
			const updated= metadata.update(db, { ...file,
				last_frame: buffer[buffer.length - 1].Frame,
				cleaned: file.cleaned += buffer.length
			});
			if (!updated) {
				return reject(`Failed to update metadata for file: ${file.name}`);
			}

			buffer = await cleaner.getBuffer();

			file = metadata.read(db, file.name);
		}

		// Update file metadata to show cleaning has completed
		const updated = metadata.update(db, { ...file,
			completed: 1
		});
		if (!updated) {
			return reject(`Failed to update metadata for file: ${file.name}`);
		}

		cleaner.close();

		return resolve();
	});
}

ipcMain.handle('csv-reset-file', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
		const file = metadata.read(db, filename);
		if (!file) {
			return reject(`File: ${filename} has not been opened`);
		}

		const updated = metadata.update(db, { ...file,
			requested: 0
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
		const file = metadata.read(db, filename);
		if (!file) {
			return reject(`File: ${filename} has not been opened`);
		}

		const rows = await csvrows.read(db, file);
		if (rows === undefined) {
		    return reject(`Failed to read cleaned rows for file: ${filename}`);
		}

		const updated = metadata.update(db, { ...file,
			requested: file.requested + rows.length
		});
		if (!updated) {
		    return reject(`Failed to update requested count for file: ${filename}`);
		}

        return resolve(rows);
    });
});

ipcMain.handle('csv-get-first-and-last', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		const file = metadata.read(db, filename);
		if (!file) {
			return reject(`File: ${filename} has not been opened`);
		}

		const result = csvrows.firstAndLast(db, file);
		if (!result) {
		    return reject(`Failed to read cleaned rows for file: ${filename}`);
		}

		return resolve(result);
	});
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show();
});
