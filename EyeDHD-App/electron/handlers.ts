import { app, dialog, ipcMain, ipcRenderer, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

import DatabaseManager, { DataType, StreamKey, StreamType } from './db/DatabaseManager';
import { Metadata } from './db/tables/metadata';

const FFMPEG_PATH: string = ffmpegPath ?? 'ERROR: ffmpeg binary not found';

// Database setup
// Set testing to true to use a temporary db instead of a file
const appRoot = app.getAppPath();
const dbmgr = new DatabaseManager({
	path: path.join(appRoot, 'main.db'),
	temporary: false,
	logging: false
});

/**
	* Handles the csv-open-file request. Opens a file selector
	*
	* @returns filename if a file is selected, or null if none is selected
	*/
ipcMain.handle('csv-open-file', async (_) => {
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
			dbmgr.openFile(filename, filepath);

			return resolve(filename);
		} catch (err) {
			return reject(`Failed to open file: ${err}`);
		}
	});
});

ipcMain.handle('csv-get-metadata', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);

			return resolve(metadata);
		} catch (err) {

			return reject(`Failed to get metadata for file: ${filename}. Error: ${err}`);
		}
	});
});

ipcMain.handle('csv-get-file-list', async (_) => {
	return new Promise(async (resolve, reject) => {
		try {
			const files = dbmgr.metadata.readAll();

			if (!files) {
				return resolve(null);
			}

			return resolve(files);
		} catch (err) {
			return reject(`Failed to get file list. Error: ${err}`);
		}
	});
});

ipcMain.handle('csv-reset-reading-progress', async (_, filename) => {
	return new Promise<void>(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			dbmgr.metadata.resetReading(metadata);

			return resolve();
		} catch (err) {
			return reject(`Failed to reset reading progress for file: ${filename}. Error: ${err}`);
		}
	});
});

ipcMain.handle('csv-reset-cleaning-progress', async (_, filename) => {
	return new Promise<void>(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			dbmgr.metadata.resetCleaning(metadata);
			dbmgr.csv.clear(metadata);

			if (dbmgr.cleanerExists(metadata)) {
				dbmgr.resetCleaner(metadata);
			}

			return resolve();
		} catch (err) {
			return reject(`Failed to reset cleaning progress for file: ${filename}. Error: ${err}`);
		}
	});
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			const rows = dbmgr.csv.read(metadata);

			return resolve(rows);
		} catch (err) {
			return reject(err);
		}
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
			const metadata = dbmgr.metadata.read(filename);
			// Start cleaning in background without blocking
			dbmgr.cleanFile(metadata);

			return resolve({ success: true, message: 'Data cleaning initiated' });
		} catch (err) {
			return reject(`Failed to start cleaning for file: ${filename}. Error: ${err}`);
		}
	});
});

/**
 * Handles the csv-get-stats request. Gets current cleaning statistics for a file
 *
 * @param filename - The name of the file to get stats for
 * @returns Object containing cleaning statistics and performance metrics
 */
ipcMain.handle('csv-get-stats', async (_, filename: string) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			const cleaner = dbmgr.getCleaner(metadata);
			if (!cleaner) {
				return reject(`File: ${filename} has not been opened`);
			}

			if (!cleaner.isActive()) {
				// File finished cleaning
				console.log(`File: ${filename} cleaning completed`);
			}

			const stats = cleaner.getStats();
			const performanceData = cleaner.getPerformance();

			return resolve({
				stats,
				performance: performanceData,
				status: cleaner.status
			});
		} catch (err) {
			return reject(`Failed to get stats for file: ${filename}. Error: ${err}`);
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
		try {
			const metadata = dbmgr.metadata.read(filename);
			const cleaner = dbmgr.getCleaner(metadata);
			if (!cleaner) {
				return reject(`File: ${filename} has not been opened`);
			}

			if (!cleaner.isActive()) {
				// File finished cleaning
				console.log(`File: ${filename} cleaning completed`);
			}

			const progress = cleaner.getProgress();
			return resolve(progress);
		} catch (err) {
			return reject(`Failed to get progress for file: ${filename}. Error: ${err}`);
		}
	});
});

/**
* Handles the csv-export-data request. Exports cleaned CSV data to a new file
*/
ipcMain.handle('csv-export-data', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			if (!metadata.completed) {
				return reject(`File: ${filename} hasn't been cleaned yet. Clean the file first.`);
			}

			// Show save dialog
			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Export Cleaned CSV',
				defaultPath: path.join(os.homedir(), `${path.parse(filename).name}_cleaned.csv`),
				filters: [{ name: 'CSV Files', extensions: ['csv'] }]
			});

			if (canceled || !filePath) {
				return resolve({ success: false, message: 'Export canceled' });
			}

			// Export the cleaned data
			const result = await exportToCSV(filename, filePath);
			return resolve(result);
		} catch (err) {
			return reject(`Failed to export file: ${filename}. Error: ${err}`);
		}
	});
});

/**
* Handles generic file save requests with binary data
*/
ipcMain.handle('csv-save-file', async (_, options) => {
	return new Promise(async (resolve, reject) => {
		try {
			const { defaultPath, filters, data } = options;

			// Show save dialog
			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Save File',
				defaultPath: defaultPath || 'output.bin',
				filters: filters || [{ name: 'All Files', extensions: ['*'] }]
			});

			if (canceled || !filePath) {
				return resolve({ success: false, message: 'Save canceled' });
			}

			// Convert Uint8Array to Buffer if needed
			let bufferData;
			if (data instanceof Uint8Array) {
				bufferData = Buffer.from(data);
			} else if (Array.isArray(data)) {
				bufferData = Buffer.from(data);
			} else {
				bufferData = data;
			}

			// Write the data to file
			fs.writeFileSync(filePath, bufferData);

			return resolve({
				success: true,
				filePath: filePath,
				message: `File saved to ${filePath}`
			});
		} catch (err) {
			return reject(`Failed to save file: ${err}`);
		}
	});
});

async function exportToCSV(filename: string, outputPath: string) {
	return new Promise(async (resolve) => {
		try {
			let csvContent = '';
			let exportedRows = 0;

			const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
			let metadata = dbmgr.metadata.read(filename);

			// Add header row
			csvContent += metadata.header;

			let rows = dbmgr.csv.read(metadata);
			metadata = dbmgr.metadata.read(filename);
			while (rows !== null && rows.length > 0) {
				for (const row of rows) {
					Object.values(row).forEach((value) => {
						csvContent += value + ',';
					});
					csvContent = csvContent.slice(0, -1) + '\n'; // Remove trailing comma and add newline
					exportedRows++;
				}

				stream.write(csvContent);
				csvContent = '';

				rows = dbmgr.csv.read(metadata);
				metadata = dbmgr.metadata.read(filename);
			}

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

ipcMain.handle('csv-get-first-and-last', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);
			const result = dbmgr.csv.firstAndLast(metadata);

			return resolve(result);
		} catch (err) {
			return reject(`Failed to get first and last rows for file: ${filename}. Error: ${err}`);
		}
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

ipcMain.handle('video-sync-vr', async (_, { vrFile, animFile, offsetSeconds }) => {
	// check what main gets from preload
	console.log('main handler got offsetSeconds =', offsetSeconds);
	return await SidebySide(vrFile, animFile, offsetSeconds);
});

/**
* Animation Export Handlers
*/

// Store for managing export sessions
const exportSessions = new Map();

/**
* Initialize a new export session
*/
ipcMain.handle('animation-export-init', async (_, options) => {
	return new Promise(async (resolve, reject) => {
		try {
			const sessionId = Date.now().toString();
			const { fileName, exportFormat = 'webm', quality = 'high' } = options;

			// Show save dialog
			let fileExtension;
			let filterName;

			if (exportFormat === 'zip') {
				fileExtension = 'zip';
				filterName = 'Image Sequence';
			} else if (exportFormat === 'webm') {
				fileExtension = 'webm';
				filterName = 'WebM Video';
			} else {
				fileExtension = 'webm'; // Default to WebM since it works without FFmpeg
				filterName = 'WebM Video';
			}

			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Export Animation',
				defaultPath: path.join(
					os.homedir(),
					`${path.parse(fileName).name}_animation.${fileExtension}`
				),
				filters: [{ name: filterName, extensions: [fileExtension] }]
			});

			if (canceled || !filePath) {
				return resolve({ success: false, message: 'Export canceled' });
			}

			// Create export session
			const session = {
				id: sessionId,
				fileName,
				outputPath: filePath,
				exportFormat: fileExtension,
				quality,
				frames: [] as any[],
				status: 'initialized',
				totalFrames: 0,
				processedFrames: 0,
				startTime: Date.now()
			};

			exportSessions.set(sessionId, session);

			return resolve({ success: true, sessionId, outputPath: filePath });
		} catch (err) {
			return reject(`Failed to initialize export: ${err}`);
		}
	});
});

/**
* Add frame data to export session
*/
ipcMain.handle('animation-export-add-frame', async (_, sessionId, frameData) => {
	return new Promise(async (resolve, reject) => {
		try {
			const session = exportSessions.get(sessionId);
			if (!session) {
				return reject(`Export session ${sessionId} not found`);
			}

			// Convert base64 data URL to buffer
			const base64Data = frameData.frameData.replace(/^data:image\/png;base64,/, '');
			const buffer = Buffer.from(base64Data, 'base64');

			// Store frame data with proper timestamp
			session.frames.push({
				index: frameData.frameIndex,
				timestamp: frameData.timestamp,
				buffer: buffer
			});

			session.processedFrames = session.frames.length;
			session.status = 'collecting';

			return resolve({ success: true, frameCount: session.frames.length });
		} catch (error: any) {
			return reject(`Failed to add frame: ${error.message}`);
		}
	});
});

/**
* Finalize export and create video/image sequence
*/
ipcMain.handle('animation-export-finalize', async (_, sessionId) => {
	return new Promise(async (resolve, reject) => {
		try {
			const session = exportSessions.get(sessionId);
			if (!session) {
				return reject(`Export session ${sessionId} not found`);
			}

			session.status = 'processing';
			session.totalFrames = session.frames.length;

			// Sort frames by index to ensure proper order
			session.frames.sort((a: any, b: any) => a.index - b.index);

			if (session.exportFormat === 'zip') {
				// Export as image sequence
				await exportImageSequence(session);
			} else {
				// Use MediaRecorder approach for video - create from canvas stream
				await exportUsingMediaRecorder(session);
			}

			session.status = 'completed';
			session.endTime = Date.now();

			const result = {
				success: true,
				outputPath: session.outputPath,
				frameCount: session.totalFrames,
				duration: session.endTime - session.startTime
			};

			// Cleanup session
			exportSessions.delete(sessionId);

			return resolve(result);
		} catch (err) {
			const session = exportSessions.get(sessionId);
			if (session) {
				session.status = 'error';
				session.error = err.message;
			}
			return reject(`Failed to finalize export: ${err}`);
		}
	});
});

/**
* Get export session progress
*/
ipcMain.handle('animation-export-progress', async (_, sessionId) => {
	return new Promise(async (resolve) => {
		const session = exportSessions.get(sessionId);
		if (!session) {
			return resolve({ error: 'Session not found' });
		}

		return resolve({
			status: session.status,
			processedFrames: session.processedFrames,
			totalFrames: session.totalFrames,
			progress:
			session.totalFrames > 0
			? (session.processedFrames / session.totalFrames) * 100
			: 0
		});
	});
});

/**
* Cancel export session
*/
ipcMain.handle('animation-export-cancel', async (_, sessionId) => {
	return new Promise(async (resolve) => {
		const session = exportSessions.get(sessionId);
		if (session) {
			session.status = 'cancelled';
			exportSessions.delete(sessionId);
		}
		return resolve({ success: true });
	});
});

// Helper function to export as image sequence (ZIP)
async function exportImageSequence(session: any) {
	const JSZip = await import('jszip');
	const zip = new JSZip.default();

	// Add each frame as PNG to zip with proper naming
	for (const frame of session.frames) {
		const paddedIndex = frame.index.toString().padStart(8, '0');
		zip.file(`frame_${paddedIndex}.png`, frame.buffer);
	}

	// Add metadata file
	const metadata = {
		frameCount: session.frames.length,
		frameRate: 30,
		duration: session.frames.length / 30,
		exportDate: new Date().toISOString(),
		sourceFile: session.fileName
	};
	zip.file('metadata.json', JSON.stringify(metadata, null, 2));

	// Generate ZIP buffer and save
	const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
	fs.writeFileSync(session.outputPath, zipBuffer);
}

// Helper function to use browser MediaRecorder approach
async function exportUsingMediaRecorder(session: any) {
	// Since we can't easily recreate MediaRecorder on the backend,
	// let's create a simple WebM file using the frames
	// For now, fall back to image sequence if WebM was requested
	await exportImageSequence(session);
}

type StartArgs = { type: StreamType, file: Metadata };
type StartRet = Promise<StreamKey>;
ipcMain.handle('stream:start', async (_, { type, file }: StartArgs): StartRet => {
	return await dbmgr.startStream(type, file);
})

type PullArgs = { key: StreamKey, count: number };
ipcMain.handle('stream:pull', async (e, { key, count }: PullArgs) => {
	const { done } = await dbmgr.pullStream(key, count, (rows) => {
		e.sender.send('stream:data', { key, rows });
	});

	if (done) {
		e.sender.send('stream:end', { key });
	}
});

ipcMain.on('stream:cancel', (_, { key }: { key: StreamKey }) => {
	dbmgr.cancelStream(key);
})

/**
* Handles the notify request. Creates an OS notification with the given message
*/
ipcMain.on('notify', (_, message) => {
	new Notification({ title: 'EyeDHD', body: message }).show();
});
