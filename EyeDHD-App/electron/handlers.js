import { dialog, ipcMain, Notification } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';

import getDB from '../models/dbmgr.js';
import files from '../models/actions/files.js';
import csv from '../models/actions/csv.js';
import { sleep } from './utils';

const db = getDB();

let worker = null;

/**
 * Handles the csv-open-file request. Opens a file selector and begins cleaning it if one is selected
 *
 * @returns filename if a file is selector, or null if none are selected
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
		const { ok: exists } = files.read(db, filename);
		if (exists) {
		    // Update buffer_size if different, reset rows_read so 'csv-reset-file' is unneeded
			return resolve(filename);
		}

		const { ok } = files.create(db, filename, filepath, buffer_size);
		if (!ok) {
			return reject(`Failed to create document in db for file: ${filename}`);
		}

		// Wait until worker has finished working
		while (worker) {
		    await sleep(100);
		}

		// Read and clean csv file in a separate thread, so main thread can still respond
		// to messages
		worker = new Worker(path.join(__dirname, 'stuff', 'csv_worker.js'), {
            workerData: { filename, filepath, buffer_size }
        });
		worker.on('message', msgHandler);
        worker.on('exit', exitHandler);

        return resolve(filename);
    });
});

const msgHandler = (msg) => {
    if (!msg.ok) {
        console.error(`Worker error for file: ${filename}`, msg.err);
    }

    worker = null;
}

const exitHandler = (code) => {
    if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
    }

    worker = null;
}

ipcMain.handle('csv-reset-file', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
		const { ok: exists, file } = files.read(db, filename);
		if (!exists) {
			return reject(`File: ${filename} is not opened`);
		}

		// Update rows_read to 0;
		file.rows_read = 0;
		// Update file
		if (!ok) {
		    return reject(`Failed to read cleaned rows for file: ${filename}`);
		}

        return resolve(rows);
    });
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
		const { ok: exists, file } = files.read(db, filename);
		if (!exists) {
			return reject(`File: ${filename} is not opened`);
		}

		const { ok, rows } = csv.read(db, file);
		if (!ok) {
		    return reject(`Failed to read cleaned rows for file: ${filename}`);
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
