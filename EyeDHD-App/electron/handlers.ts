import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ChildProcess, spawn, spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

import DatabaseManager from './db/DatabaseManager';
import { type StreamKey } from './db/DataStream';
import caseDataActions, { animationOutputPath, type CaseData, type SegmentInput, type DetectionConfig, csvImportPath, csvOutputPath } from './db/tables/CaseData';
import { type ConfigProfile, type ConfigProfileCreate, type ConfigProfileUpdate } from './db/tables/ConfigProfile';
import { type UserData } from './db/tables/UserData';

import { runGazeCsvPipeline } from '@saccades/pipeline/runGazeCsvPipeline';
import { prepareVisualizationModels } from '@saccades/visualization/prep/prepareVisualizationData';
import { buildCaseOutputBundle } from '@saccades/outputs/caseBundle';
import { writeCaseBundle } from '@saccades/export/writeCaseBundle';
import type { CaseOutputBundleInput } from '@saccades/outputs/caseBundle';
import {
	buildScatterFigureSpec,
	buildRateSeriesFigureSpec,
	buildIsiHistogramFigureSpec,
} from '@saccades/visualization/render';
import { createSkiaCanvasPngBackend } from '@saccades/visualization/render/backends/png';
import type { SaccadeDetectionOptions } from '@saccades/core/schema';
import type { SaccadeMetricsOptions, SegmentDefinition } from '@saccades/metrics/types';
import type { FigureOverlaySpec } from '@saccades/visualization/render/types';

const appRoot = app.getAppPath();
const FFMPEG_PATH: string = (() => {
	const raw = ffmpegPath;
	if (!raw) return 'ERROR: ffmpeg binary not found';
	// When packaged, ffmpeg-static is unpacked from the asar — fix the path.
	return app.isPackaged ? raw.replace('app.asar', 'app.asar.unpacked') : raw;
})();

// In dev, app.getAppPath() is the project root (writable). When packaged,
// it's inside the read-only app.asar archive, so user-level state must live
// in Electron's per-user writable directory (userData).
const mainDbRoot = app.isPackaged ? app.getPath('userData') : appRoot;

/**
 * Main database setup
 * The main database keeps track of user settings like project directory
 */
const main_manager = new DatabaseManager({
	path: path.join(mainDbRoot, 'main.db'),
	temporary: false,
	logging: false
});

/**
 * The project database in stored in the project folder and keeps track
 * of the opened csv files and their cleaning progress. This is initialized when the user
 * confims a selected project directory.
 */
let project_manager: DatabaseManager | null = null;

/**
 * Helper function to check if a directory is structured like a project directory by
 * checking for the existence of the cases folder and the project.db. We use this to
 * validate a existing project on startup
 */
function isProjectStructured(dir: string): boolean {
	const dbPath = path.join(dir, 'project.db');
	return fs.existsSync(dbPath) && fs.statSync(dbPath).isFile();
}

/**
 * Helper function to check if a directory is empty by checking if it exists, is a
 * directory, and has no files in it. We use this to validate a selected project
 * directory before initializing it, since we don't want to accidentally mess with an
 * existing directory that has files in it.
 */
/**
 * Best-effort sweep of the project-level `.trash/` directory. Removed cases are
 * first renamed into this folder (see `case:remove`); any entries that couldn't
 * be rm'd in the same session — typically because Windows had lingering file
 * handles from AV scanners, Explorer preview, or video thumbnailers — get
 * cleaned up here once those handles are released.
 */
function sweepProjectTrash(dir: string): void {
	const trashDir = path.join(dir, '.trash');
	if (!fs.existsSync(trashDir)) {
		return;
	}

	for (const entry of fs.readdirSync(trashDir)) {
		const entryPath = path.join(trashDir, entry);
		try {
			fs.rmSync(entryPath, {
				recursive: true,
				force: true,
				maxRetries: 5,
				retryDelay: 200
			});
		} catch {
			// Still locked — try again on next startup.
		}
	}
}

function isProjectEmpty(dir: string): boolean {
	if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
		return true;
	}

	const files = fs.readdirSync(dir);
	const visibleFiles = files.filter((name) => {
		if (name === '.DS_Store' || name === '.localized' || name === 'Icon\r') {
			return false;
		}

		if (name.startsWith('._')) {
			return false;
		}

		return true;
	});

	return visibleFiles.length === 0;
}

/*
 * User handlers
 */

/**
 * Handles the user:read request.
 *
 * Reads the user data from the main database, which includes the project directory
 * and initialization status, and returns it to the renderer process. Verifies if
 * the selected folder is setup properly and updates initialization status if necessary.
 */
ipcMain.handle('user:read', async () => {
	return new Promise(async (resolve, reject) => {
		try {
			const user = main_manager.actions.user.read();

			// Check if folder is structured properly if dir is set, and update
			// initialization status if needed. This is in case the project gets messed up
			// during runtime or while app is closed
			//
			// Should adjust to prompt user to select new directory if project gets
			// messed up, but for now just reset
			if (user.dir) {
				let structured: boolean;
				let empty: boolean;

				try {
					structured = isProjectStructured(user.dir);
					empty = isProjectEmpty(user.dir);
				} catch (err) {
					if ((err as NodeJS.ErrnoException).code === 'EPERM' || (err as NodeJS.ErrnoException).code === 'EACCES') {
						const updated_user = main_manager.actions.user.update(user, {
							dir: '',
							project_initialized: 0
						});
						return resolve(updated_user);
					}
					throw err;
				}

				if (user.project_initialized) {
					if (!structured || empty) {
						const updated_user = main_manager.actions.user.update(user, {
							dir: '',
							project_initialized: 0
						});
						return resolve(updated_user);
					}
				} else {
					if (structured) {
						const updated_user = main_manager.actions.user.update(user, {
							project_initialized: 1
						});
						return resolve(updated_user);
					}
				}
			} else if (user.project_initialized) {
				const updated_user = main_manager.actions.user.update(user, {
					project_initialized: 0
				});
				return resolve(updated_user);
			}

			return resolve(user);
		} catch (err) {
			return reject(`Failed to read user data: ${err}`);
		}
	});
});

/**
 * Handles the user:select-directory request.
 *
 * Opens a native dialog to select a project directory and returns the selected path and
 * its initialization status.
 */
ipcMain.handle('user:select-directory', async (_, user: UserData) => {
	return new Promise(async (resolve, reject) => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ['openDirectory']
		});

		if (canceled) {
			return resolve(null);
		}

		const dirPath = filePaths[0];

		const empty = isProjectEmpty(dirPath);
		const structured = isProjectStructured(dirPath);

		try {
			return resolve({
				dir: dirPath,
				status: {
					empty,
					structured
				}
			})
		} catch (err) {
			return reject(`Failed to set project directory: ${err}`);
		}
	});
});

/**
 * Handles the user:initialize-directory request.
 *
 * Initializes the project manager with the selected directory, checks that the directory
 * is properly structured, and creates the project database if it doesn't exist. This is
 * used when the app starts up and a project directory is already set in the user data,
 * so we can connect to the existing project database and read the cases.
 */
ipcMain.handle('user:initialize-manager', async (_, user: UserData) => {
	return new Promise(async (resolve, reject) => {
		if (project_manager) {
			return resolve({});
		}

		try {
			if (!fs.existsSync(user.dir)) {
				return reject(`Directory does not exist: ${user.dir}`);
			}

			if (!isProjectStructured(user.dir)) {
				return reject(`Saved directory is not initialized as a project: ${user.dir}`);
			}

			project_manager = new DatabaseManager({
				path: path.join(user.dir, 'project.db')
			});

			// Recreate the cases folder if it was deleted while the app was closed.
			// Case records will be cleaned up by case:verify-files, which runs next.
			const casesDir = path.join(user.dir, 'cases');
			if (!fs.existsSync(casesDir)) {
				fs.mkdirSync(casesDir);
			}

			sweepProjectTrash(user.dir);

			return resolve({});
		} catch (err) {
			return reject(`Failed to initialize project manager: ${err}`);
		}
	});
});

/**
 * Handles the user:initialize-directory request.
 *
 * Initializes the selected directory as the project directory by creating necessary
 * folders and files, and updates the user data with the new directory and initialization
 * status. This is used when the user selects a new project directory, so we set up the
 * project database and folders for that directory.
 */
ipcMain.handle('user:initialize-directory', async (_, dir: string, user: UserData) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!fs.existsSync(dir)) {
				return reject(`Directory does not exist: ${dir}`);
			}

			// Allow the directory only if it is empty or already a structured project folder.
			// Reject anything else to avoid accidentally overwriting unrelated content.
			const alreadyStructured = isProjectStructured(dir);
			if (!alreadyStructured && !isProjectEmpty(dir)) {
				return reject(`Directory is not empty: ${dir}. Please select an empty directory or an existing project folder.`);
			}

			// Initialize project manager with project directory
			project_manager = new DatabaseManager({
				path: path.join(dir, 'project.db')
			});

			// Create dirPath/cases directory
			const casesDir = path.join(dir, 'cases');
			if (!fs.existsSync(casesDir)) {
				fs.mkdirSync(casesDir);
			}

			const updated_user = main_manager.actions.user.update(user, {
				dir,
				project_initialized: 1
			});
			return resolve(updated_user);
		} catch (err) {
			return reject(`Failed to initialize user directory: ${err}`);
		}
	});
});

/*
 * Case handlers
 */

/**
 * Handles the case:create-new request.
 *
 * Creates a new case folder in the project directory with the given name, along with
 * the necessary subfolders for imports, outputs, and graphs. Also creates a new
 * metadata entry for the case in the project database. Returns the created casedata.
 */
ipcMain.handle('case:create-new', async (_, casename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const user = main_manager.actions.user.read();
			if (!user.dir) {
				return reject('No project directory set for user');
			}

			const caseDir = path.join(user.dir, 'cases', casename);
			const importsDir = path.join(caseDir, 'imports');
			const outputsDir = path.join(caseDir, 'outputs');
			const graphsDir = path.join(outputsDir, 'graphs');

			[caseDir, importsDir, outputsDir, graphsDir].forEach((dirPath) => {
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath);
				}
			});

			const trial = project_manager.createCase(casename, caseDir);
			return resolve(trial);
		} catch (err) {
			return reject(`Failed to create case: ${err}`);
		}
	});
});

/**
 * Handles the case:remove request.
 *
 * Deletes the case folder from disk (imports, outputs, graphs) and removes the
 * metadata entry from the project database. Returns the removed casedata.
 */
ipcMain.handle('case:remove', async (_, trial: CaseData) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!trial) {
				return reject('No case provided for removal');
			}

			const storedCase = project_manager.actions.case.read(trial.name);
			if (!storedCase) {
				return reject(`Case not found: ${trial.name}`);
			}

			if (storedCase.path && fs.existsSync(storedCase.path)) {
				// Rename to a project-level .trash dir first — on Windows, rename
				// succeeds even when child handles are held (AV scanners, Explorer
				// preview, video thumbnailer), whereas rm on the folder itself
				// fails with EPERM. The rm that follows is best-effort; anything
				// left behind gets swept on next app startup (see sweepProjectTrash).
				const user = main_manager.actions.user.read();
				const trashDir = path.join(user.dir, '.trash');
				if (!fs.existsSync(trashDir)) {
					fs.mkdirSync(trashDir, { recursive: true });
				}
				const trashPath = path.join(
					trashDir,
					`${path.basename(storedCase.path)}-${Date.now()}`
				);

				try {
					fs.renameSync(storedCase.path, trashPath);
				} catch (renameErr) {
					return reject(`Failed to remove case folder (is it open in another program?): ${renameErr}`);
				}

				try {
					fs.rmSync(trashPath, {
						recursive: true,
						force: true,
						maxRetries: 10,
						retryDelay: 200
					});
				} catch {
					// Swallow — folder is out of cases/ and will be cleaned up on
					// next startup once the OS releases lingering handles.
				}
			}

			const removed = project_manager.actions.case.remove(storedCase);
			return resolve(removed);
		} catch (err) {
			return reject(`Failed to remove case: ${err}`);
		}
	});
});

/**
 * Handles the case:select-csv request.
 *
 * Opens a native file dialog to select a CSV file and returns the selected file path.
 * This is used when importing a CSV into a case, so the user can select the file they
 * want to import.
 */
ipcMain.handle('case:select-csv', async () => {
	return new Promise(async (resolve, reject) => {
		try {
			const { canceled, filePaths } = await dialog.showOpenDialog({
				properties: ['openFile'],
				filters: [{ name: 'CSV Files', extensions: ['csv'] }]
			});

			if (canceled) {
				return resolve(null);
			}

			return resolve(filePaths[0] ?? null);
		} catch (err) {
			return reject(`Failed to select CSV: ${err}`);
		}
	});
});

/**
 * Handles the case:import-csv request.
 *
 * Copies the selected CSV file into the case imports folder and creates a new entry
 * for the imported file in the project database. Returns the updated casedata with
 * the new file entry. This is used after the user selects a CSV to import, so we can
 * copy it into the project and track it in the database.
 */
ipcMain.handle('case:import-csv', async (_, trial: CaseData, filepath: string) => {
	return new Promise(async (resolve, reject) => {
		if (!filepath) {
			return reject('No file path provided for import');
		}

		try {
			const user = main_manager.actions.user.read();
			if (!user.dir) {
				return reject('No project directory set for user');
			}
			if (!trial) {
				return reject('No case provided for import');
			}

			const storedCase = project_manager.actions.case.read(trial.name);

			const importPath = csvImportPath(storedCase);
			const importDir = path.dirname(importPath);
			if (!fs.existsSync(importDir)) {
				fs.mkdirSync(importDir, { recursive: true });
			}

			fs.copyFileSync(filepath, importPath);

			const updated = project_manager.actions.case.resetCleaning(storedCase);
			return resolve(updated);
		} catch (err) {
			return reject(`Failed to import CSV: ${err}`);
		}
	});
});

/**
 * Handles the case:read-casedata request.
 *
 * Reads the casedata for a given case name from the project database and returns it.
 * This is used to get the latest casedata after changes have been made, so we can
 * update the UI with the latest information about the case and its files.
 */
ipcMain.handle('case:read-casedata', async (_, filename) => {
	return new Promise(async (resolve, reject) => {
		try {
			const trial = project_manager.actions.case.read(filename);
			return resolve(trial);
		} catch (err) {
			return reject(`Failed to read metadata for file: ${filename}. Error: ${err}`);
		}
	});
});

/**
 * Saves user-defined segments and detection config for a case. Both fields
 * are optional — pass null to clear a field, or omit it to leave it unchanged.
 */
ipcMain.handle('case:save-config', async (_, trial: CaseData, config: {
	segments?: SegmentInput[] | null;
	detection_config?: DetectionConfig | null;
}) => {
	return new Promise(async (resolve, reject) => {
		try {
			const storedCase = project_manager.actions.case.read(trial.name);
			const updates: Partial<CaseData> = {};

			if (config.segments !== undefined) {
				updates.segments = config.segments;
			}
			if (config.detection_config !== undefined) {
				updates.detection_config = config.detection_config;
			}

			const updated = project_manager.actions.case.update(storedCase, updates);
			return resolve(updated);
		} catch (err) {
			return reject(`Failed to save config for case: ${trial.name}. Error: ${err}`);
		}
	});
});

/**
 * Lists all config profiles saved in the current project.
 */
ipcMain.handle('profile:list', async () => {
	return new Promise<ConfigProfile[]>((resolve, reject) => {
		try {
			if (!project_manager) {
				return reject('No project is currently open');
			}
			return resolve(project_manager.actions.configProfile.list());
		} catch (err) {
			return reject(`Failed to list config profiles. Error: ${err}`);
		}
	});
});

/**
 * Creates a new config profile. Rejects if the name is already in use.
 */
ipcMain.handle('profile:create', async (_, input: ConfigProfileCreate) => {
	return new Promise<ConfigProfile>((resolve, reject) => {
		try {
			if (!project_manager) {
				return reject('No project is currently open');
			}
			if (!input?.name?.trim()) {
				return reject('Profile name is required');
			}
			if (project_manager.actions.configProfile.exists(input.name.trim())) {
				return reject(`A profile named "${input.name.trim()}" already exists`);
			}
			return resolve(project_manager.actions.configProfile.create(input));
		} catch (err) {
			return reject(`Failed to create config profile. Error: ${err}`);
		}
	});
});

/**
 * Updates an existing config profile by id. Rejects if renaming would collide
 * with another existing profile.
 */
ipcMain.handle('profile:update', async (_, profile: ConfigProfile, updates: ConfigProfileUpdate) => {
	return new Promise<ConfigProfile>((resolve, reject) => {
		try {
			if (!project_manager) {
				return reject('No project is currently open');
			}
			const stored = project_manager.actions.configProfile.read(profile.id);

			if (updates.name !== undefined) {
				const newName = updates.name.trim();
				if (!newName) {
					return reject('Profile name cannot be empty');
				}
				if (newName !== stored.name && project_manager.actions.configProfile.exists(newName)) {
					return reject(`A profile named "${newName}" already exists`);
				}
			}

			return resolve(project_manager.actions.configProfile.update(stored, updates));
		} catch (err) {
			return reject(`Failed to update config profile. Error: ${err}`);
		}
	});
});

/**
 * Deletes a config profile by id. Returns the deleted profile.
 */
ipcMain.handle('profile:delete', async (_, profile: ConfigProfile) => {
	return new Promise<ConfigProfile>((resolve, reject) => {
		try {
			if (!project_manager) {
				return reject('No project is currently open');
			}
			const stored = project_manager.actions.configProfile.read(profile.id);
			return resolve(project_manager.actions.configProfile.remove(stored));
		} catch (err) {
			return reject(`Failed to delete config profile. Error: ${err}`);
		}
	});
});

let ffmpeg: ChildProcess | null = null;

type EncoderChoice = {
	codec: string;
	encoderArgs: string[];
};

let cachedEncoder: EncoderChoice | null = null;

function probeEncoders(): Set<string> {
	try {
		const res = spawnSync(FFMPEG_PATH, ['-hide_banner', '-encoders'], {
			encoding: 'utf8',
			timeout: 5000,
		});
		if (res.status !== 0 || !res.stdout) return new Set();
		const names = new Set<string>();
		for (const line of res.stdout.split('\n')) {
			const m = line.match(/^\s*[VASFXBD.]{6}\s+(\S+)/);
			if (m) names.add(m[1]);
		}
		return names;
	} catch {
		return new Set();
	}
}

function selectEncoder(): EncoderChoice {
	if (cachedEncoder) return cachedEncoder;
	const available = probeEncoders();
	const candidates: EncoderChoice[] = [];
	if (process.platform === 'darwin') {
		candidates.push({ codec: 'h264_videotoolbox', encoderArgs: ['-b:v', '8M'] });
	}
	candidates.push({ codec: 'h264_nvenc', encoderArgs: ['-preset', 'p4', '-b:v', '8M'] });
	candidates.push({ codec: 'h264_qsv',   encoderArgs: ['-preset', 'veryfast', '-b:v', '8M'] });
	candidates.push({ codec: 'h264_amf',   encoderArgs: ['-quality', 'speed', '-b:v', '8M'] });
	candidates.push({ codec: 'libx264',    encoderArgs: ['-preset', 'ultrafast', '-crf', '23'] });
	const picked = candidates.find((c) => available.has(c.codec)) ?? candidates[candidates.length - 1];
	console.log(`[ffmpeg] selected encoder: ${picked.codec}`);
	cachedEncoder = picked;
	return picked;
}

ipcMain.on('case:start-ffmpeg', (_, trial, size) => {
	const output_path = animationOutputPath(trial);
	const enc = selectEncoder();
	ffmpeg = spawn(FFMPEG_PATH, [
		"-y",
		"-f", "rawvideo",
		"-pix_fmt", "rgba",
		"-s", `${size.width}x${size.height}`,
		"-r", `${30}`,
		"-i", "pipe:0",
		"-vf", "vflip",
		"-c:v", enc.codec,
		...enc.encoderArgs,
		"-pix_fmt", "yuv420p",
		output_path
	], { stdio: ["pipe", "inherit", "inherit"] });

	ffmpeg.on('exit', (code) => {
		if (code !== 0 && code !== null && enc.codec !== 'libx264') {
			console.warn(`[ffmpeg] ${enc.codec} exited code=${code}; falling back to libx264 for remainder of session`);
			cachedEncoder = { codec: 'libx264', encoderArgs: ['-preset', 'ultrafast', '-crf', '23'] };
		}
	});
});

ipcMain.handle('case:stop-ffmpeg', async (_, trial: CaseData, completed) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!ffmpeg) {
				return resolve({});
			}

			const stdin = ffmpeg.stdin;
			const endStdin = () => {
				if (stdin && !stdin.writableEnded) {
					stdin.end();
				}
			};

			if (!completed) {
				ffmpeg.on('close', () => ffmpeg = null);
				endStdin();
				return resolve({});
			}

			ffmpeg.on('close', (code) => {
				ffmpeg = null;

				if (code === 0) {
					try {
						const storedCase = project_manager.actions.case.read(trial.name);
						project_manager.actions.case.update(storedCase, {
							tasks: {
								...storedCase.tasks,
								animation: true
							}
						});
					} catch (err) {
						return reject(`Failed to update case after FFMPEG closed: ${err}`);
					}
					return resolve({});
				} else {
					return reject(new Error(`FFMPEG failed with code: ${code}`));
				}
			});

			endStdin();
		} catch (err) {
			return reject(`Failed to stop FFMPEG for file: ${trial.name}. Error: ${err}`);
		}
	});
});

ipcMain.handle('case:save-animation', async (_, trial, frames, size) => {
	return new Promise(async (resolve, reject) => {
		try {
			// If the task was cancelled (user navigated away), stdin may already have
			// been ended by case:stop-ffmpeg. Silently drop the frames rather than
			// throwing ERR_STREAM_WRITE_AFTER_END.
			if (!ffmpeg || !ffmpeg.stdin || ffmpeg.stdin.writableEnded || ffmpeg.stdin.destroyed) {
				return resolve({});
			}

			for (const frame of frames) {
				if (ffmpeg.stdin.writableEnded || ffmpeg.stdin.destroyed) {
					break;
				}
				ffmpeg.stdin.write(frame);
			}

			resolve({});
		} catch (err) {
			return reject(`Failed to save animation frames for file: ${trial.name}. Error: ${err}`);
		}
	});
});

/*
 * CSV Handlers
 */

/**
 * Handles the csv:reset-cleaning-progress request.
 *
 * Resets the cleaning progress of a file in the database, allowing it to be cleaned
 * again from the start. This is used when the user wants to redo the cleaning process
 * for a file, so we reset any progress and allow them to start over.
 */
ipcMain.handle('csv:reset-cleaning-progress', async (_, trial) => {
	return new Promise<void>(async (resolve, reject) => {
		try {
			project_manager.actions.case.resetCleaning(trial);

			return resolve();
		} catch (err) {
			return reject(`Failed to reset reading progress for file: ${trial.name}. Error: ${err}`);
		}
	});
});

/**
 * TODO: update this for new UI changes
 */
ipcMain.handle('csv:export-data', async (_, trial: CaseData) => {
	return new Promise(async (resolve, reject) => {
		try {
			if (!trial.tasks.cleaning) {
				return reject(`File: ${trial.name} hasn't been cleaned yet. Clean the file first.`);
			}

			// Show save dialog
			const { canceled, filePath } = await dialog.showSaveDialog({
				title: 'Export Cleaned CSV',
				defaultPath: path.join(os.homedir(), `${path.parse(trial.name).name}_Cleaned.csv`),
				filters: [{ name: 'CSV Files', extensions: ['csv'] }]
			});

			if (canceled || !filePath) {
				return resolve({ success: false, message: 'Export canceled' });
			}

			const storedTrial = project_manager.actions.case.read(trial.name);
			const sourcePath = csvOutputPath(storedTrial);

			if (!fs.existsSync(sourcePath)) {
				return resolve({ success: false, message: `Cleaned CSV not found for ${trial.name}` });
			}

			fs.copyFileSync(sourcePath, filePath);

			const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

			return resolve({
				success: true,
				message: `Successfully exported ${storedTrial.cleaned_rows ?? 0} cleaned rows to ${filePath}`,
				stats: {
					totalExported: storedTrial.cleaned_rows ?? 0,
					filePath,
					fileSize
				}
			});
		} catch (err) {
			return reject(`Failed to export file: ${trial.name}. Error: ${err}`);
		}
	});
});

/*
 * Saccade detection handler
 */

/**
 * Handles the case:run-detection request.
 *
 * Reads the cleaned CSV for the given case, runs the saccade detection pipeline,
 * prepares visualization model data, builds the output bundle, and writes all
 * analysis CSVs and metadata JSONs to the case outputs directory. Marks the
 * detection task as complete in the database when finished.
 */
ipcMain.handle('case:run-detection', async (_, trial: CaseData) => {
	return new Promise(async (resolve, reject) => {
		try {
			const storedCase = project_manager.actions.case.read(trial.name);

			// Read cleaned CSV
			const cleanedPath = csvOutputPath(storedCase);
			if (!fs.existsSync(cleanedPath)) {
				return reject(`Cleaned CSV not found for case: ${storedCase.name}. Run cleaning first.`);
			}
			const csvText = fs.readFileSync(cleanedPath, 'utf-8');

			// Build pipeline options from stored case config
			const detectionOverrides: Partial<SaccadeDetectionOptions> = {};
			const cfg = storedCase.detection_config;
			if (cfg) {
				if (cfg.velocityThresholdDegPerSec !== undefined)
					detectionOverrides.velocityThresholdDegPerSec = cfg.velocityThresholdDegPerSec;
				if (cfg.minDurationMs !== undefined)
					detectionOverrides.minDurationMs = cfg.minDurationMs;
				if (cfg.minInterSaccadeMs !== undefined)
					detectionOverrides.minInterSaccadeMs = cfg.minInterSaccadeMs;
			}

			const plausibleBounds: SaccadeMetricsOptions['plausibleBounds'] =
				cfg?.amplitudeBounds
					? { amplitudeDeg: { min: cfg.amplitudeBounds.min ?? 0, max: cfg.amplitudeBounds.max ?? Infinity } }
					: undefined;

			const segments: SegmentDefinition[] = (storedCase.segments ?? []).map(seg => ({
				id: seg.id,
				startTime: seg.startMs,
				endTime: seg.endMs,
			}));

			// Run saccade detection pipeline. We filter to VALID gaze rows only —
			// the cleaner keeps INVALID rows with (0,0,0) vectors, which would crash
			// the angular velocity normalization step. The csv.* metrics flags are
			// opt-in; without them sessionSummaryRow stays null and the output CSV
			// is empty.
			const metricsOptions: SaccadeMetricsOptions = {
				...(plausibleBounds ? { plausibleBounds } : {}),
				...(segments.length > 0 ? { segments, isiBySegment: true } : {}),
				csv: {
					sessionSummaryRow: true,
					segmentSummaryRows: true,
				},
			};

			const pipelineResult = runGazeCsvPipeline(csvText, {
				adapter: {
					selection: {
						includeGazeStatuses: ['VALID'],
					},
				},
				detection: detectionOverrides,
				metrics: metricsOptions,
			});

			// Map pipeline results to visualization prep input
			const vizInput = {
				perSaccade: pipelineResult.analysis.metrics.perSaccadeRows.map((row) => ({
					timeMs: row.startTime,
					amplitudeDeg: row.amplitudeDeg,
				})),
				isiValuesMs: pipelineResult.analysis.metrics.isiSeries,
				segments: segments.map(seg => ({
					id: seg.id,
					startTimeMs: seg.startTime,
					endTimeMs: seg.endTime,
				})),
			};
			const vizResult = prepareVisualizationModels(vizInput, {
				includeMarkers: segments.length > 0,
			});

			// Build overlay spec from segments for time-based figures
			const figureOverlays: FigureOverlaySpec | undefined =
				segments.length > 0
					? {
						segmentBoundaries: segments.flatMap(seg => [
							{ timeMs: seg.startTime, label: `${seg.id} start` },
							{ timeMs: seg.endTime, label: `${seg.id} end` },
						]),
					}
					: undefined;

			// Build the CaseOutputBundleInput
			const bundleInput: CaseOutputBundleInput = {
				metadata: {
					caseId: storedCase.name,
					sourceFileName: storedCase.name,
				},
				runConfig: {},
				analysis: {
					perSaccade: pipelineResult.analysis.metrics.perSaccadeRows.map((row) => ({
						timeMs: row.startTime,
						amplitudeDeg: row.amplitudeDeg,
						durationMs: row.durationMs,
					})),
					sessionSummary: pipelineResult.analysis.metrics.csv.sessionSummaryRow
						? { ...pipelineResult.analysis.metrics.csv.sessionSummaryRow }
						: undefined,
					segmentSummaries: pipelineResult.analysis.metrics.csv.segmentSummaryRows.map((seg) => ({
						segmentId: seg.segmentId,
						saccadeCount: seg.keptCount,
						ratePerSec: seg.ratePerSec,
					})),
					isiValuesMs: pipelineResult.analysis.metrics.isiSeries,
					diagnostics: {
						parse: pipelineResult.parse.diagnostics,
						adapter: pipelineResult.adapter.diagnostics,
						detection: {
							saccadeCount: pipelineResult.analysis.detection.saccades.length,
							filtered: pipelineResult.analysis.metrics.filtered,
						},
					},
				},
				visualization: {
					scatter: vizResult.scatter,
					rateSeries: vizResult.rateSeries,
					isiHistogram: vizResult.isiHistogram,
					markers: vizResult.markers.map((m) => ({
						timeMs: m.timeMs,
						label: m.label ?? '',
						kind: m.kind,
					})),
				},
			};

			// Build the output bundle. PNG descriptors come back with content: null —
			// we populate them with FigureRenderSpecs built from the visual models so
			// the writer's PNG backend can render them.
			const bundle = buildCaseOutputBundle(bundleInput);

			const caseId = storedCase.name;
			const scatterSpec = buildScatterFigureSpec(
				bundle.visuals.scatterModel,
				{ title: `Saccade Scatter Plot - ${caseId}`, overlays: figureOverlays }
			);
			const rateSeriesSpec = buildRateSeriesFigureSpec(
				{ points: bundle.visuals.rateSeriesModel.points },
				{ title: `Saccade Rate Series - ${caseId}`, overlays: figureOverlays }
			);
			const isiHistogramSpec = buildIsiHistogramFigureSpec(
				{ bins: bundle.tables.isiHistogramRows },
				{ title: `Intersaccadic Intervals - ${caseId}` }
			);

			for (const file of bundle.files) {
				if (file.format !== 'png') continue;
				if (file.key === 'scatterPng') file.content = scatterSpec;
				else if (file.key === 'rateSeriesPng') file.content = rateSeriesSpec;
				else if (file.key === 'isiHistogramPng') file.content = isiHistogramSpec;
			}

			const outputDir = path.join(storedCase.path, 'outputs');
			const writeResult = writeCaseBundle(bundle, {
				rootDir: outputDir,
				caseFolderName: '',
				png: {
					backend: createSkiaCanvasPngBackend(),
					dpi: 300,
					background: 'white',
				},
			});

			// Mark detection as complete
			project_manager.actions.case.update(storedCase, {
				tasks: { detection: true },
			});

			return resolve({
				artifacts: writeResult.artifacts,
				saccadeCount: pipelineResult.analysis.detection.saccades.length,
			});
		} catch (err) {
			return reject(`Failed to run detection for case: ${trial.name}. Error: ${err}`);
		}
	});
});

/*
 * VR video and Animation side-by-side handlers
 */

/**
 * Handles the vr:select-video-file request.
 *
 * Opens a native file dialog to select a video file and returns the selected file path.
 * This is used when selecting a VR video to sync with an Animation video, so the user
 * can choose the VR video they want to use for syncing.
 */
ipcMain.handle('vr:select-video-file', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm'] }]
	});

	if (result.canceled || result.filePaths.length === 0) return null;
	return result.filePaths[0];
});

/**
 * Takes in the file paths for the VR and Animation videos, along with the offset in
 * seconds, and processes them using ffmpeg to create a new side-by-side video with the
 * specified offset. Returns the file path to the synced output video.
 */
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

/**
 * Handles the vr:video-sync-vr request.
 *
 * Takes in the file paths for the VR and Animation videos, along with the offset in
 * seconds, and processes them using ffmpeg to create a new side-by-side video with the
 * specified offset. Returns the file path to the synced output video.
 */
ipcMain.handle('vr:video-sync-vr', async (_, { vrFile, animFile, offsetSeconds }) => {
	// check what main gets from preload
	console.log('main handler got offsetSeconds =', offsetSeconds);
	return await SidebySide(vrFile, animFile, offsetSeconds);
});

/*
 * Data stream handlers
 */

/**
 * Handles the stream:start request.
 *
 * Starts a new data stream of the specified type, optionally associated with a file,
 * and returns a unique stream key to the renderer process. The stream key is used
 * for subsequent pull and cancel requests to identify the stream.
 */
ipcMain.handle('stream:start', async (_, { type, trial }): Promise<StreamKey> => {
	if (!project_manager) {
		throw new Error('Project not initialized');
	}
	return await project_manager.startStream(type, trial);
})

/**
 * Handles the stream:pull request.
 *
 * Pulls the next batch of data from the stream identified by the given key, and sends
 * the data back to the renderer process in chunks using the 'stream:data' event. The
 * count parameter specifies how many batches to pull in this request, allowing for
 * efficient data retrieval without overwhelming memory.
 */
ipcMain.handle('stream:pull', async (event, { key, count }) => {
	if (!project_manager) {
		throw new Error('Project not initialized');
	}
	await project_manager.pullStream(key, count, (rows, progress) => {
		event.sender.send('stream:data', { key, rows, progress });
	});
});

/**
 * Handles the stream:cancel request.
 *
 * Cancels the active stream identified by the given key, freeing up any resources
 * associated with that stream. This is used when the renderer process no longer needs
 * data from the stream, such as when a component unmounts or the user cancels an
 * operation.
 */
ipcMain.on('stream:cancel', (_, { key }) => {
	if (!project_manager) return;
	project_manager.cancelStream(key);
});

/**
 * Handles the notify request.
 */
ipcMain.on('notify', (_, message) => {
	new Notification({ title: 'EyeDHD', body: message }).show();
});

type CaseRecovery = {
	caseName: string;
	sourceMissing: boolean;
	resetTasks: Array<'cleaning' | 'detection' | 'animation' | 'combination'>;
};

/**
 * Verifies that the output files for each case match the task flags stored in the
 * database.
 *
 * - If a case's folder is missing entirely, the case is removed from the database and
 *   added to the `deleted` list. The user must re-create those cases from scratch.
 * - If a case's source CSV is missing, all task flags are cleared.
 * - If a specific output file is missing, the corresponding task flag (and any
 *   flags that depend on it) are cleared.
 *
 * Returns `deleted` (case names removed from DB) and `recoveries` (task flags reset)
 * so the renderer can notify the user.
 */
ipcMain.handle('case:verify-files', (): { recoveries: CaseRecovery[]; deleted: string[] } => {
	if (!project_manager) return { recoveries: [], deleted: [] };

	// Collect all rows first so the iterator is fully consumed before any
	// mutations run — better-sqlite3 throws "database connection is busy" if
	// you call remove/update while the same connection has an open iterator.
	const allCases = [...caseDataActions.iterate(project_manager['db']).iterate()];

	const recoveries: CaseRecovery[] = [];
	const deleted: string[] = [];

	for (const c of allCases) {
		if (!fs.existsSync(c.path)) {
			// Case folder is gone — remove from DB entirely. The user will need to
			// re-create the case and re-import the source data.
			project_manager.actions.case.remove(c);
			deleted.push(c.name);
			continue;
		}

		const recovery: CaseRecovery = {
			caseName: c.name,
			sourceMissing: false,
			resetTasks: []
		};
		const taskUpdates: Partial<CaseData['tasks']> = {};
		let needsUpdate = false;

		const allTaskKeys = ['cleaning', 'detection', 'animation', 'combination'] as const;

		const sourcePath = csvImportPath(c);
		if (!fs.existsSync(sourcePath)) {
			recovery.sourceMissing = true;
			for (const key of allTaskKeys) {
				if (c.tasks[key]) { taskUpdates[key] = false; recovery.resetTasks.push(key); }
			}
			needsUpdate = recovery.resetTasks.length > 0;
		} else {
			if (c.tasks.cleaning && !fs.existsSync(csvOutputPath(c))) {
				// Cleaned CSV gone — all downstream tasks are invalid
				for (const key of allTaskKeys) {
					if (c.tasks[key]) { taskUpdates[key] = false; recovery.resetTasks.push(key); }
				}
				needsUpdate = true;
			} else if (c.tasks.animation && !fs.existsSync(animationOutputPath(c))) {
				// Animation MP4 gone — reset animation + combination only
				for (const key of ['animation', 'combination'] as const) {
					if (c.tasks[key]) { taskUpdates[key] = false; recovery.resetTasks.push(key); }
				}
				needsUpdate = true;
			}
		}

		if (needsUpdate) {
			project_manager.actions.case.update(c, { tasks: taskUpdates });
			recoveries.push(recovery);
		}
	}

	return { recoveries, deleted };
});
