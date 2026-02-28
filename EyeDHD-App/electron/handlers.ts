import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

import DatabaseManager from './db/DatabaseManager';
import { type StreamKey } from './db/DataStream';
import { type CaseData, caseImportCsvPath, caseOutputCsvPath } from './db/tables/CaseData';
import { type User } from './db/tables/User';

const FFMPEG_PATH: string = ffmpegPath ?? 'ERROR: ffmpeg binary not found';

// TODO: consider creating another database that is stored in the project folder which
// will contain the csv data rows, or don't store any csv in database and go straight
// to csv.

// Main database setup
// The main database keeps track of user settings like project directory
const appRoot = app.getAppPath();
const main_manager = new DatabaseManager({
	path: path.join(appRoot, 'main.db'),
	temporary: false,
	logging: false
});
// The project database in stored in the project folder and keeps track
// of the opened csv files and their cleaning progress. This is initialized when the user
// confims a selected project directory.
let project_manager: DatabaseManager | null = null;
let project_dir: string | null = null;

function requireProjectManager(): DatabaseManager {
	if (!project_manager) {
		throw new Error('Project database not initialized. Initialize a project directory first.');
	}
	return project_manager;
}

function isProjectInitialized(dirPath: string): boolean {
	const projectDbPath = path.join(dirPath, 'project.db');
	const casesDir = path.join(dirPath, 'cases');

	const projectDbExists = fs.existsSync(projectDbPath);
	const casesDirExists = fs.existsSync(casesDir) && fs.statSync(casesDir).isDirectory();

	return projectDbExists && casesDirExists;
}

/*
 * User handlers
 */

ipcMain.handle('user:read', async () => {
	return new Promise(async (resolve, reject) => {
		try {
			const user = main_manager.actions.user.read();
			return resolve(user);
		} catch (err) {
			return reject(`Failed to read user data: ${err}`);
		}
	});
});

ipcMain.handle('user:select-directory', async (_, user: User) => {
	return new Promise(async (resolve, reject) => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ['openDirectory']
		});

		if (canceled) {
			return resolve(null);
		}

		const dirPath = filePaths[0];
		try {
			const initialized = isProjectInitialized(dirPath);
			project_manager = null;
			project_dir = null;
			const new_user = main_manager.actions.user.update(user, {
				dir: dirPath,
				project_initialized: initialized ? 1 : 0
			});
			return resolve(new_user);
		} catch (err) {
			return reject(`Failed to set project directory: ${err}`);
		}
	});
});

ipcMain.handle('user:initialize-directory', async (_, user: User) => {
	return new Promise(async (resolve, reject) => {
		try {
			const dirPath = user.dir;
			if (!dirPath) {
				return reject('No directory set for user');
			}

			if (!fs.existsSync(dirPath)) {
				return reject(`Directory does not exist: ${dirPath}`);
			}

			if (project_manager && project_dir === dirPath && isProjectInitialized(dirPath)) {
				const updated_user = main_manager.actions.user.update(user, { project_initialized: 1 });
				return resolve(updated_user);
			}

			// Initialize project manager with project directory
			project_manager = new DatabaseManager({
				path: path.join(dirPath, 'project.db')
			});
			project_dir = dirPath;

			// Create dirPath/cases directory
			const casesDir = path.join(dirPath, 'cases');
			if (!fs.existsSync(casesDir)) {
				fs.mkdirSync(casesDir);
			}

			const updated_user = main_manager.actions.user.update(user, { project_initialized: 1 });
			return resolve(updated_user);
		} catch (err) {
			return reject(`Failed to initialize user directory: ${err}`);
		}
	});
});

/*
 * Case handlers
 */

ipcMain.handle('case:create-new', async (_, caseName) => {
	return new Promise(async (resolve, reject) => {
		try {
			const user = main_manager.actions.user.read();
			if (!user.dir) {
				return reject('No project directory set for user');
			}
			if (!caseName || typeof caseName !== 'string') {
				return reject('Case name is required');
			}

			const manager = requireProjectManager();

			const caseDir = path.join(user.dir, 'cases', caseName);
			const importsDir = path.join(caseDir, 'imports');
			const outputsDir = path.join(caseDir, 'outputs');
			const graphsDir = path.join(outputsDir, 'graphs');

			[caseDir, importsDir, outputsDir, graphsDir].forEach((dirPath) => {
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath);
				}
			});

			const casedata = manager.createCase(caseName, caseDir);
			return resolve(casedata);
		} catch (err) {
			return reject(`Failed to create case: ${err}`);
		}
	});
});

ipcMain.handle('case:import-csv', async (_, casedata: CaseData) => {
	return new Promise(async (resolve, reject) => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ['openFile'],
			filters: [{ name: 'CSV Files', extensions: ['csv'] }]
		});

		if (canceled) {
			return resolve(null);
		}

		const filepath = filePaths[0];

		try {
			const user = main_manager.actions.user.read();
			if (!user.dir) {
				return reject('No project directory set for user');
			}
			if (!casedata) {
				return reject('No case provided for import');
			}

			const manager = requireProjectManager();
			const storedCase = manager.actions.case.read(casedata.name);

			const importPath = caseImportCsvPath(storedCase);
			const importDir = path.dirname(importPath);
			if (!fs.existsSync(importDir)) {
				fs.mkdirSync(importDir, { recursive: true });
			}

			fs.copyFileSync(filepath, importPath);

			const updatedCase = manager.actions.case.resetCleaning(storedCase);
			return resolve(updatedCase);
		} catch (err) {
			return reject(`Failed to import CSV: ${err}`);
		}
	});
});

// Handles the case:read-casedata request.
// Reads the metadata for a given file from the database and returns it
ipcMain.handle('case:read-casedata', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const manager = requireProjectManager();
			const casedata = manager.actions.case.read(filename);
			return resolve(casedata);
		} catch (err) {
			return reject(`Failed to read metadata for file: ${filename}. Error: ${err}`);
		}
	});
});

/*
 * CSV Handlers
 */

// Handles the csv:reset-cleaning-progress request.
// Resets the cleaning progress for a given file in the database
ipcMain.handle('csv:reset-cleaning-progress', async (_, file) => {
	return new Promise<void>(async (resolve, reject) => {
		try {
			const manager = requireProjectManager();
			manager.actions.case.resetCleaning(file);

			return resolve();
		} catch (err) {
			return reject(`Failed to reset reading progress for file: ${file.name}. Error: ${err}`);
		}
	});
});

ipcMain.handle('csv:export-data', async (_, file: CaseData) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!file.cleaned) {
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

			const manager = requireProjectManager();
			const storedCase = manager.actions.case.read(file.name);
			const sourcePath = caseOutputCsvPath(storedCase);

			if (!fs.existsSync(sourcePath)) {
				return resolve({ success: false, message: `Cleaned CSV not found for ${file.name}` });
			}

			fs.copyFileSync(sourcePath, filePath);

			const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

			return resolve({
				success: true,
				message: `Successfully exported ${storedCase.cleaned_rows ?? 0} cleaned rows to ${filePath}`,
				stats: {
					totalExported: storedCase.cleaned_rows ?? 0,
					filePath,
					fileSize
				}
			});
		} catch (err) {
			return reject(`Failed to export file: ${file.name}. Error: ${err}`);
		}
	});
});

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
function SidebySide(
	vrFile: string,
	animFile: string,
	offsetSeconds: number
): Promise<string> {
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

		const ff = spawn(FFMPEG_PATH, args);
		ff.stderr.on('data', (d) => console.log('[ffmpeg sync]', d.toString()));

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
	const manager = requireProjectManager();
	return await manager.startStream(type, file);
})

// Pulls the next chunk of data for a stream. The callback sends the data back
// to the renderer in batches until the stream is done
ipcMain.handle('stream:pull', async (event, { key, count }) => {
	const manager = requireProjectManager();
	await manager.pullStream(key, count, (rows, progress) => {
		event.sender.send('stream:data', { key, rows, progress });
	});
});

// Cancels an active stream, freeing up any associated resources
ipcMain.on('stream:cancel', (_, { key }) => {
	const manager = requireProjectManager();
	manager.cancelStream(key);
});

// Handles the notify request. Creates an OS notification with the given message
ipcMain.on('notify', (_, message) => {
	new Notification({ title: 'EyeDHD', body: message }).show();
});
