import { dialog, ipcMain, Notification } from 'electron';
import path from 'path';

import { filesMap } from './store.js';
import getDB from '../models/dbmgr.js';
import documents from '../models/actions/documents.js';
import document from '../models/actions/document.js';
import DataCleaner from './stuff/DataCleaner.js';

const db = getDB();

/**
 * Handles the csv-open-file request. Opens a file selector and begins cleaning it if one is selected
 *
 * @returns filename if a file is selector, or null if none are selected
 */
ipcMain.handle('csv-open-file', async (_, bufferSize) => {
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
		const { ok: exists, _ } = documents.read(db, filename);
		if (exists) {
			return resolve(filename);
		}

		const { ok, document } = documents.create(db, filename, filepath, bufferSize);
		if (!ok || document.filename !== filename) {
			return reject(`Failed to create document in db for file: ${filename}`);
		}

        return resolve(filename);
    });
});

/**
 * Handles the csv-close-file request. Closes the cleaner for filename
 */
ipcMain.handle('csv-close-file', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        if (!filename) return resolve();

        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        cleaner.close();
        const ok = filesMap.delete(filename);
        if (!ok) {
            return reject(`Failed to close file: ${filename}`);
        }

        resolve();
    });
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        const buf = await cleaner.getBuffer();
        return resolve(buf);
    });
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show();
});