import { dialog, ipcMain, Notification } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';

import getDB from '../models/dbmgr';
import createMetadataTable from '../models/tables/metadata';
import createRowsTable from '../models/tables/rows';
import metadata from '../models/actions/metadata';
import rows from '../models/actions/rows';
import { sleep } from './utils';

const db = getDB();
createMetadataTable(db);

let worker = null;

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
		const { ok: exists } = metadata.read(db, filename);
		if (exists) {
		    // Update buffer_size if different, reset rows_read so 'csv-reset-file' is unneeded
			return resolve(filename);
		}

		const { ok } = metadata.create(db, filename, filepath, buffer_size);
		if (!ok) {
			return reject(`Failed to create metadata in db for file: ${filename}`);
		}
		createRowsTable(db, filename);

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

        return resolve(rows);
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
		const { ok: exists, file } = metadata.read(db, filename);
		if (!exists) {
			return reject(`File: ${filename} has not been opened`);
		}

		const { ok, rows } = rows.read(db, file);
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
