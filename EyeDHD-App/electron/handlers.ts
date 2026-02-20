import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

import DatabaseManager from './db/DatabaseManager';
import { type StreamKey } from './db/DataStream';
import { type Metadata } from './db/tables/metadata';

const FFMPEG_PATH: string = ffmpegPath ?? 'ERROR: ffmpeg binary not found';

// Database setup
const appRoot = app.getAppPath();
const manager = new DatabaseManager({
	path: path.join(appRoot, 'main.db'),
	temporary: false,
	logging: false
});

/*
 * CSV file / case handlers
 */

// Handles the csv-open-file request. Opens a file selector
ipcMain.handle('csv:open-file', async (_) => {
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

		try {
			const metadata = manager.openFile(filename, filepath);

			return resolve(metadata);
		} catch (err) {
			return reject(`Failed to open file: ${err}`);
		}
	});
});

//
ipcMain.handle('csv:read-metadata', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = manager.metadata.read(filename);
			return resolve(metadata);
		} catch (err) {
			return reject(`Failed to read metadata for file: ${filename}. Error: ${err}`);
		}
	});
});

//
ipcMain.handle('csv:reset-cleaning-progress', async (_, file) => {
	return new Promise<void>(async (resolve, reject) => {
		try {
			manager.metadata.resetCleaning(file);

			return resolve();
		} catch (err) {
			return reject(`Failed to reset reading progress for file: ${file.name}. Error: ${err}`);
		}
	});
});

// Handles the csv-export-data request. Exports cleaned CSV data to a new file
ipcMain.handle('csv:export-data', async (_, file: Metadata) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!file.completed) {
				return reject(`File: ${file.name} hasn't been cleaned yet. Clean the file first.`);
			}

			// Show save dialog
			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Export Cleaned CSV',
				defaultPath: path.join(os.homedir(), `${path.parse(file.name).name}_cleaned.csv`),
				filters: [{ name: 'CSV Files', extensions: ['csv'] }]
			});

			if (canceled || !filePath) {
				return resolve({ success: false, message: 'Export canceled' });
			}

			// Export the cleaned data
			const result = await exportToCSV(file, filePath);
			return resolve(result);
		} catch (err) {
			return reject(`Failed to export file: ${file.name}. Error: ${err}`);
		}
	});
});

//
async function exportToCSV(file: Metadata, outputPath: string) {
	return new Promise(async (resolve) => {
		try {
			let csvContent = '';
			let exportedRows = 0;

			const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
			const metadata = manager.metadata.read(file.name);

			// Add header row
			csvContent += metadata.header;

			const streamkey = await manager.startStream("CSVData", file);
			const data = manager.getStream(streamkey);

			for await (const batch of data) {
				for (const row of batch) {
					Object.values(row).forEach((value) => {
						csvContent += value + ',';
					});
					csvContent = csvContent.slice(0, -1) + '\n'; // Remove trailing comma and add newline
					exportedRows++;

					stream.write(csvContent);
					csvContent = '';
				}
			}

			manager.cancelStream(streamkey);
			stream.end();

			console.log('export complete.');

			return resolve({
				success: true,
				message: `Successfully exported ${exportedRows} cleaned rows to ${outputPath}`,
				stats: {
					totalExported: exportedRows,
					filePath: outputPath,
					fileSize: csvContent.length
				}
			});
		} catch (err) {
			return resolve({
				success: false,
				message: `Failed to export CSV: ${err}`,
				error: err
			});
		}
	});
}

/*
 * VR video and Animation side-by-side handlers
 */

// Handles the select-video-file request. Opens a file selector for video files
// and returns the selected file path
ipcMain.handle('vr:select-video-file', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
	});

	if (result.canceled || result.filePaths.length === 0) return null;
	return result.filePaths[0];
});

// Used by the video-sync-vr request handler to stitch together the VR and
// Animation videos using FFMPEG
function SidebySide(vrFile: any, animFile: any, offsetSeconds: number) {
	return new Promise((resolve, reject) => {
		const offset = Number(offsetSeconds);

		// offseting no going through? logs
		// console.log("SidebySide raw offsetSeconds =", offsetSeconds);
		// console.log("SidebySide numeric offset =", offset);

		if (Number.isNaN(offset)) {
			// hard fail instead of silently using 0
			return reject(new Error('invalid offsetSeconds passed into SidebySide'));
		}

		// synced file saved next to vr video
		const outputPath = path.join(path.dirname(vrFile), `synced_${Date.now()}.mp4`);

		// safe file names for drawtext labels
		const vrName = path.basename(vrFile).replace(/'/g, "''");
		const animName = path.basename(animFile).replace(/'/g, "''");

		let filter;

		if (offset >= 0) {
			// positive offset = animation starts later than vr
			filter =
				`[0:v]scale=1280:-2,drawtext=text='${vrName}':x=10:y=10:fontsize=24:fontcolor=white[vr];` +
				`[1:v]setpts=PTS+${offset}/TB,scale=1280:-2,` +
				`drawtext=text='${animName}':x=10:y=10:fontsize=24:fontcolor=white[anim];` +
				`[vr][anim]vstack=inputs=2[v]`;
		} else {
			// negative offset = animation leads, delay vr instead
			const delay = Math.abs(offset);
			filter =
				`[0:v]setpts=PTS+${delay}/TB,scale=1280:-2,` +
				`drawtext=text='${vrName}':x=10:y=10:fontsize=24:fontcolor=white[vr];` +
				`[1:v]scale=1280:-2,drawtext=text='${animName}':x=10:y=10:fontsize=24:fontcolor=white[anim];` +
				`[vr][anim]vstack=inputs=2[v]`;
		}

		const args = [
			'-y',
			'-i',
			vrFile,
			'-i',
			animFile,
			'-filter_complex',
			filter,
			'-map',
			'[v]',
			'-map',
			'0:a?', // keep vr audio if it exists
			'-c:v',
			'libx264',
			'-c:a',
			'copy',
			'-preset',
			'veryfast',
			'-crf',
			'20',
			outputPath
		];

		console.log('[ffmpeg sync] running:', FFMPEG_PATH, args.join(' '));

		const ff: any = spawn(FFMPEG_PATH, args);
		ff.stderr.on('data', (d: any) => console.log('[ffmpeg sync]', d.toString()));

		ff.on('close', (code: number) => {
			if (code === 0) resolve(outputPath);
			else reject(new Error('ffmpeg sync failed with code ' + code));
		});
	});
}

// Handles the video-sync-vr request. Takes in the VR and Animation video file paths
// and the offset, calls SidebySide to process them, and returns the path to
// the synced output video
ipcMain.handle('vr:video-sync-vr', async (_, { vrFile, animFile, offsetSeconds }) => {
	// check what main gets from preload
	console.log('main handler got offsetSeconds =', offsetSeconds);
	return await SidebySide(vrFile, animFile, offsetSeconds);
});

/*
 * Data stream handlers
 */

// Starts a new stream for the given type and file (if applicable).
// Returns a unique stream key to identify the stream in subsequent calls
ipcMain.handle('stream:start', async (_, { type, file }): Promise<StreamKey> => {
	return await manager.startStream(type, file);
})

// Pulls the next chunk of data for a stream. The callback sends the data back
// to the renderer in batches until the stream is done
ipcMain.handle('stream:pull', async (event, { key, count }) => {
	const _ = await manager.pullStream(key, count, (rows, progress) => {
		event.sender.send('stream:data', { key, rows, progress });
	});
});

ipcMain.on('stream:cancel', (_, { key }) => {
	manager.cancelStream(key);
});

// Handles the notify request. Creates an OS notification with the given message
ipcMain.on('notify', (_, message) => {
	new Notification({ title: 'EyeDHD', body: message }).show();
});
