import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

import DatabaseManager from './data/Manager';
import { type Metadata } from './data/tables/metadata';
import { type CSVData } from './data/tables/csv';

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const FFMPEG_PATH: string = ffmpegPath ?? 'ERROR: ffmpeg binary not found';

/**
	* Database setup
	* Set testing to true to use a temporary db instead of a file
	*/
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
ipcMain.handle('csv-open-file', async (_, request_size) => {
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
			// If file is already opened and cleaning, just return filename
			if (dbmgr.metadata.exists(filename)) {
				const metadata = dbmgr.metadata.read(filename);
				if (!dbmgr.cleanerExists(metadata)) {
					dbmgr.resetCleaner(metadata);
				}

				if (request_size != metadata.request_size) {
					dbmgr.metadata.update({
						...metadata,
						request_size
					});
				}
				return resolve(filename);
			}

			dbmgr.metadata.create(filename, filepath, request_size);

			return resolve(filename);
		} catch (err) {
			return reject(`Failed to open file: ${err}`);
		}
	});
});

function cleanFile(original: Metadata): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			let metadata = original;

			const cleaner = dbmgr.getCleaner(metadata);
			let buffer = await cleaner.getBuffer();

			if (cleaner.status.done) {
				return;
			}

			// Only set the first frame number when cleaning is not in progress
			if (metadata.cleaned === 0) {
				dbmgr.metadata.update({
					...metadata,
					header: cleaner.header.join(',') + '\n',
					first_frame: buffer?.[0].Frame
				});

				metadata = dbmgr.metadata.read(metadata.name);
			}

			while (buffer) {
				dbmgr.csv.store(metadata, buffer);

				dbmgr.metadata.update({
					...metadata,
					last_frame: buffer[buffer.length - 1].Frame,
					cleaned: (metadata.cleaned += buffer.length)
				});

				buffer = await cleaner.getBuffer();
				metadata = dbmgr.metadata.read(metadata.name);
			}

			dbmgr.metadata.update({ ...metadata, completed: 1 });
			cleaner.close();

			return resolve();
		} catch (err) {
			return reject(`Failed to clean file: ${err}`);
		}
	});
}

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
			dbmgr.metadata.update({ ...metadata, requested: 0 });

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
			dbmgr.metadata.update({
				...metadata,
				requested: 0,
				cleaned: 0,
				completed: 0,
				first_frame: 0,
				last_frame: 0
			});

			dbmgr.csv.clear(metadata);

			const cleaner = dbmgr.getCleaner(metadata);
			if (!cleaner) return resolve();

			cleaner.close();
			dbmgr.resetCleaner(metadata);

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
	return getBuffer(filename);
});

async function getBuffer(
	filename: string,
	request_size_override: number | null = null
): Promise<CSVData[] | null> {
	return new Promise(async (resolve, reject) => {
		try {
			const metadata = dbmgr.metadata.read(filename);

			let rows;
			if (request_size_override !== null) {
				rows = dbmgr.csv.read({
					...metadata,
					request_size: request_size_override
				});
			} else {
				rows = dbmgr.csv.read(metadata);
			}

			if (rows === undefined) {
				return reject(`Failed to read cleaned rows for file: ${filename}`);
			}

			dbmgr.metadata.update({
				...metadata,
				requested: metadata.requested + rows.length
			});

			return resolve(rows);
		} catch (err) {
			return reject(err);
		}
	});
}

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
			cleanFile(metadata).catch((error) => {
				console.error(`Background cleaning failed for ${filename}:`, error);
			});

			resolve({ success: true, message: 'Data cleaning initiated' });
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
	return new Promise(async (resolve, reject) => {
		try {
			let csvContent = '';
			let exportedRows = 0;

			const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
			const metadata = dbmgr.metadata.read(filename);

			// Add header row
			csvContent += metadata.header;

			let rows = await getBuffer(metadata.name, 1000);
			while (rows !== null && rows.length > 0) {
				if (rows === undefined) {
					return reject(`Failed to read cleaned rows for file: ${filename}`);
				}

				for (const row of rows) {
					Object.values(row).forEach((value) => {
						csvContent += value + ',';
					});
					csvContent = csvContent.slice(0, -1) + '\n'; // Remove trailing comma and add newline
					exportedRows++;
				}

				stream.write(csvContent);
				csvContent = '';

				rows = await getBuffer(metadata.name, 1000);
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
		} catch (error: any) {
			return resolve({
				success: false,
				message: `Failed to export CSV: ${error.message}`,
				error: error
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

/**
* Handles the notify request. Creates an OS notification with the given message
*/
ipcMain.on('notify', (_, message) => {
	new Notification({ title: 'EyeDHD', body: message }).show();
});
