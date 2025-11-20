import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { filesMap } from './store.js';
import getDB from '../models/dbmgr.js';
import createMetadataTable from '../models/tables/metadata.js';
import createRowsTable from '../models/tables/csvrows.js';
import metadata from '../models/actions/metadata.js';
import csvrows from '../models/actions/csvrows.js';
import DataCleaner from './stuff/DataCleaner.js';

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const FFMPEG_PATH = ffmpegPath;

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
				//filesMap.delete(file.name);
				const cleaner = new DataCleaner({
					path: file.path,
					buf_len: file.buffer_size
				});

				filesMap.set(file.name, cleaner);
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

		const cleaner = new DataCleaner({
			path: file.path,
			buf_len: file.buffer_size
		});

		filesMap.set(file.name, cleaner);

		return resolve(filename);
	});
});

function cleanFile(original) {
	return new Promise(async (resolve, reject) => {
		let file = original;

		// fetch cleaner
		const cleaner = filesMap.get(file.name);
		if (!cleaner) {
			return reject(`No cleaner found for file: ${file.name}`);
		}

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

ipcMain.handle('csv-get-metadata', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		const file = metadata.read(db, filename);
		if (!file) {
			return reject(`File: ${filename} has not been opened`);
		}

		return resolve(file);
	});
});

ipcMain.handle('csv-get-file-list', async (_) => {
	return new Promise(async (resolve, reject) => {
		const files = metadata.readAll(db);

		if (!files) {
			return resolve(null);
		}

		return resolve(files
			.filter((file) => file.completed)
			.map((file) => file.name)
		);
	});
})

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

		// filesMap.delete(file.name);

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


/**
 * Handles the csv-clean-data request. Initiates the data cleaning process for a file
 *
 * @param filename - The name of the file to clean
 * @returns Promise that resolves when cleaning is initiated (not completed)
 */
ipcMain.handle('csv-clean-data', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        try {
	       	const file = metadata.read(db, filename);
			if (!file) {
				return reject(`File: ${filename} has not been opened`);
			}

			cleanFile(file);

			resolve({ success: true, message: 'Data cleaning initiated' });
        } catch (error) {
            reject(`Failed to start cleaning for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-get-stats request. Gets current cleaning statistics for a file
 *
 * @param filename - The name of the file to get stats for
 * @returns Object containing cleaning statistics and performance metrics
 */
ipcMain.handle('csv-get-stats', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        if (!cleaner.isActive()) {
        	// File finished cleaning
         	console.log(`File: ${filename} cleaning completed`);
            //return reject(`File: ${filename} is no longer active`);
        }

        try {
            const stats = cleaner.getStats();
            const performance = cleaner.getPerformance();
            resolve({
                stats,
                performance,
                status: cleaner.status
            });
        } catch (error) {
            reject(`Failed to get stats for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-get-progress request. Gets current cleaning progress for a file
 *
 * @param filename - The name of the file to get progress for
 * @returns Object containing progress information
 */
ipcMain.handle('csv-get-progress', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        if (!cleaner.isActive()) {
        	// File finished cleaning
         	console.log(`File: ${filename} cleaning completed`);
            //return reject(`File: ${filename} is no longer active`);
        }

        try {
            const progress = cleaner.getProgress();
            resolve(progress);
        } catch (error) {
            reject(`Failed to get progress for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-export-data request. Exports cleaned CSV data to a new file
 */
ipcMain.handle('csv-export-data', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);

        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        if (cleaner.isActive()) {
            return reject(`File: ${filename} hasn't been cleaned yet. Clean the file first.`);
        }

        try {
            // Show save dialog
            const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Export Cleaned CSV',
                defaultPath: path.join(os.homedir(), `${path.parse(filename).name}_cleaned.csv`),
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] }
                ]
            });

            if (canceled || !filePath) {
                return resolve({ success: false, message: 'Export canceled' });
            }

            // Export the cleaned data
            const result = await cleaner.exportToCSV(filePath);
            resolve(result);
        } catch (error) {
            reject(`Failed to export file: ${filename}. Error: ${error.message}`);
        }
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

ipcMain.handle('select-video-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

function SidebySide(vrFile, animFile, outputPath) {
    return new Promise((resolve, reject) => {
        const args = [
            "-i", vrFile,
            "-i", animFile,
            "-filter_complex",
            "[0:v]scale=1280:-2[vr];[1:v]scale=1280:-2[anim];[vr][anim]vstack=inputs=2[v]",
            "-map", "[v]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-c:a", "copy",
            "-preset", "veryfast",
            "-crf", "20",
            outputPath
        ];

        const ff = spawn(FFMPEG_PATH, args);
        ff.stderr.on("data", d => console.log("[ffmpeg sync]", d.toString()));

        ff.on("close", code => {
            if (code === 0) resolve(outputPath);
            else reject(new Error("ffmpeg sync failed with code " + code));
        });
    });
}

ipcMain.handle("video-sync-vr", async (_, { vrFile, animFile }) => {
    const out = path.join(path.dirname(vrFile), "synced_output.mp4");
    return await SidebySide(vrFile, animFile, out);
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show();
});