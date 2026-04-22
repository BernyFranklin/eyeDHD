import { contextBridge, ipcRenderer } from 'electron';
import net from 'net';

import { type UserData } from './db/tables/UserData';
import { type CaseData, type SegmentInput, type DetectionConfig } from './db/tables/CaseData';
import { type ConfigProfile, type ConfigProfileCreate, type ConfigProfileUpdate } from './db/tables/ConfigProfile';
import { type Progress, type DataType, type StreamKey, type StreamType } from './db/DataStream';

export { Electron, Renderer, DetectionResult };

type ProjectDir = {
	dir?: string,
	status: {
		empty: boolean,
		structured: boolean
	}
}

type DetectionResult = {
	saccadeCount: number;
	artifacts: {
		key: string;
		absolutePath: string;
		relativePath: string;
		format: 'csv' | 'json' | 'png';
		category: string;
		bytes: number;
		skipped: boolean;
	}[];
}

/**
 * Declares the API that the backend exposes to the frontend through the preload script
 */
declare interface Electron {
	user: {
		read(): Promise<UserData>;
		selectDirectory(user: UserData): Promise<ProjectDir | null>;
		initializeManager(user: UserData): Promise<void>;
		initializeDirectory(dir: string, user: UserData): Promise<UserData>;
	},
	case: {
		createNew(casename: string): Promise<CaseData>;
		read(casename: string): Promise<CaseData>;
		remove(trial: CaseData): Promise<CaseData>;
		selectCsv(): Promise<string | null>;
		importCsv(trial: CaseData, filepath: string): Promise<CaseData>;
		saveConfig(trial: CaseData, config: {
			segments?: SegmentInput[] | null;
			detection_config?: DetectionConfig | null;
		}): Promise<CaseData>;
		runDetection(trial: CaseData): Promise<DetectionResult>;
		startFFMPEG(trial: CaseData, size: {
			width: number;
			height: number;
		}): Promise<void>;
		stopFFMPEG(trial: CaseData, completed: boolean): Promise<void>;
		saveAnimation(trial: CaseData, frames: Uint8Array[], size: {
			width: number;
			height: number;
		}): Promise<void>;
		verifyFiles(): Promise<{
			recoveries: Array<{
				caseName: string;
				sourceMissing: boolean;
				resetTasks: Array<'cleaning' | 'detection' | 'animation' | 'combination'>;
			}>;
			deleted: string[];
		}>;
	};

	profile: {
		list(): Promise<ConfigProfile[]>;
		create(input: ConfigProfileCreate): Promise<ConfigProfile>;
		update(profile: ConfigProfile, updates: ConfigProfileUpdate): Promise<ConfigProfile>;
		delete(profile: ConfigProfile): Promise<ConfigProfile>;
	};

	csv: {
		resetCleaningProgress(trial: CaseData): Promise<void>;
	};

	stream: {
		start(type: StreamType, file?: CaseData): Promise<StreamKey>;
		pull(key: StreamKey, batchCount: number): Promise<void>;
		cancel(key: StreamKey): void;
	}

	notify(message: string): void;
}

/**
 * Declares the API that the front uses to react to messages
 * from the backend through the preload script
 */
declare interface Renderer {
	stream: {
		onData(callback: (key: StreamKey, rows: DataType[], progress: Progress) => void): void;
		offData(callback: (key: StreamKey, rows: DataType[], progress: Progress) => void): void;
	}
}

/**
 * Per-session socket connected to the main-process animation pipe. Held open
 * across saveAnimation calls; closed on stopFFMPEG. In Step 3 this is connected
 * but unused; Step 4 will route frames through it instead of case:save-animation.
 */
let animationSocket: net.Socket | null = null;

/**
 * Defines the Electron requests
 */
const electron: Electron = {
	user: {
		/**
		 * Reads the current user data, including project directory and initialization
		 * status.
		 */
		read: async (): Promise<UserData> => {
			return await ipcRenderer.invoke('user:read');
		},
		/**
		 * Opens a native dialog to select a project directory and returns the selected
		 * path.
		 *
		 * @returns The full path of the selected directory, or null if the dialog was
		 * canceled.
		 */
		selectDirectory: async (user: UserData): Promise<ProjectDir | null> => {
			return await ipcRenderer.invoke('user:select-directory', user);
		},
		initializeManager: async (user: UserData): Promise<void> => {
			return await ipcRenderer.invoke('user:initialize-manager', user);
		},
		/**
		 * Initializes the selected directory as the project directory by creating
		 * necessary folders and files, and updates the user data with the new directory * and initialization status.
		 */
		initializeDirectory: async (dir: string, user: UserData): Promise<UserData> => {
			return await ipcRenderer.invoke('user:initialize-directory', dir, user);
		}
	},
	case: {
		/**
		 * Creates a new case folder and metadata entry in the project database.
		 */
		createNew: async (casename: string): Promise<CaseData> => {
			return await ipcRenderer.invoke('case:create-new', casename);
		},
		/**
		 * Reads the casedata for a given case. Used mostly for updating after changes.
		 */
		read: async (name: string): Promise<CaseData> => {
			return await ipcRenderer.invoke('case:read-casedata', name);
		},
		/**
		 * Deletes the case folder from disk and removes its database entry.
		 */
		remove: async (trial: CaseData): Promise<CaseData> => {
			return await ipcRenderer.invoke('case:remove', trial);
		},
		/**
		 * Prompts for a CSV file and returns the selected path.
		 */
		selectCsv: async (): Promise<string | null> => {
			return await ipcRenderer.invoke('case:select-csv');
		},
		/**
		 * Copies the selected CSV file into the case imports folder.
		 */
		importCsv: async (trial: CaseData, filepath: string): Promise<CaseData> => {
			return await ipcRenderer.invoke('case:import-csv', trial, filepath);
		},
		/**
		 * Saves user-defined segments and detection config for a case.
		 */
		saveConfig: async (trial: CaseData, config) => {
			return await ipcRenderer.invoke('case:save-config', trial, config);
		},
		/**
		 * Runs the saccade detection pipeline on the cleaned CSV for the given case
		 * and writes analysis CSVs and metadata JSONs to the case outputs directory.
		 */
		runDetection: async (trial: CaseData): Promise<DetectionResult> => {
			return await ipcRenderer.invoke('case:run-detection', trial);
		},
		startFFMPEG: async (trial: CaseData, size) => {
			const pipePath = await ipcRenderer.invoke('case:start-ffmpeg', trial, size);
			if (!pipePath) {
				console.warn('[anim-pipe] start-ffmpeg returned no pipe path');
				return;
			}
			// Connect a socket to the per-session animation pipe. Frames still flow
			// over case:save-animation in this step — the socket is held open so we
			// can confirm the transport comes up cleanly before routing frames to it
			// in Step 4. Any previous socket from a prior run is discarded.
			if (animationSocket) {
				try { animationSocket.destroy(); } catch { /* ignore */ }
				animationSocket = null;
			}
			await new Promise<void>((resolve, reject) => {
				const s = net.createConnection({ path: pipePath });
				s.once('connect', () => {
					animationSocket = s;
					console.log(`[anim-pipe] renderer connected to ${pipePath}`);
					resolve();
				});
				s.once('error', (err) => {
					console.warn(`[anim-pipe] renderer connect error: ${err.message}`);
					reject(err);
				});
			});
		},
		stopFFMPEG: async (trial: CaseData, completed: boolean): Promise<void> => {
			// Flush any pending writes before invoking stop, so main doesn't close
			// ffmpeg.stdin while bytes are still queued on the socket. end(cb) fires
			// once all buffered data has been written out.
			if (animationSocket) {
				const sock = animationSocket;
				animationSocket = null;
				await new Promise<void>((resolve) => {
					sock.end(() => resolve());
				});
			}
			return await ipcRenderer.invoke('case:stop-ffmpeg', trial, completed);
		},
		saveAnimation: async (trial: CaseData, frames: Uint8Array[], size) => {
			if (!animationSocket) {
				throw new Error('animation socket not connected; startFFMPEG must be awaited before saveAnimation');
			}
			const sock = animationSocket;
			for (const frame of frames) {
				if (!sock.write(frame)) {
					// Socket's internal buffer is full; wait for drain so we don't
					// queue unbounded memory on the renderer side.
					await new Promise<void>((resolve, reject) => {
						const onDrain = () => { sock.off('error', onError); resolve(); };
						const onError = (err: Error) => { sock.off('drain', onDrain); reject(err); };
						sock.once('drain', onDrain);
						sock.once('error', onError);
					});
				}
			}
		},
		/**
		 * Verifies that output files exist for each task flag set in the database.
		 * Clears stale flags and returns a list of affected cases for user notification.
		 */
		verifyFiles: async () => {
			return await ipcRenderer.invoke('case:verify-files');
		}
	},

	profile: {
		/**
		 * Lists all config profiles saved in the current project.
		 */
		list: async (): Promise<ConfigProfile[]> => {
			return await ipcRenderer.invoke('profile:list');
		},
		/**
		 * Creates a new config profile. Rejects on duplicate name.
		 */
		create: async (input: ConfigProfileCreate): Promise<ConfigProfile> => {
			return await ipcRenderer.invoke('profile:create', input);
		},
		/**
		 * Updates an existing config profile by id.
		 */
		update: async (profile: ConfigProfile, updates: ConfigProfileUpdate): Promise<ConfigProfile> => {
			return await ipcRenderer.invoke('profile:update', profile, updates);
		},
		/**
		 * Deletes a config profile. Returns the deleted row.
		 */
		delete: async (profile: ConfigProfile): Promise<ConfigProfile> => {
			return await ipcRenderer.invoke('profile:delete', profile);
		}
	},

	csv: {

		/**
		 * Resets the cleaning progress of a file, allowing it to be cleaned
		 * again from the start.
		 */
		resetCleaningProgress: async (trial: CaseData): Promise<void> => {
			return await ipcRenderer.invoke('csv:reset-cleaning-progress', trial);
		}
	},

	stream: {
		/**
		 * Starts a new stream of the specified type, optionally associated with a file.
		 */
		start: async (type: StreamType, trial?: CaseData): Promise<StreamKey> => {
			return await ipcRenderer.invoke('stream:start', { type, trial })
		},
		/**
		 * Pulls the next N batches from the stream.
		 */
		pull: async (key: StreamKey, batchCount: number): Promise<void> => {
			await ipcRenderer.invoke('stream:pull', { key, count: batchCount });
		},
		/**
		 * Cancels an active stream, freeing up any resources associated with it.
		 */
		cancel: (key: StreamKey) => {
			ipcRenderer.send('stream:cancel', { key });
		}
	},
	/**
	 * Sends a notification message to the main process to be displayed as
	 * a desktop notification
	 */
	notify: (message: string) => {
		ipcRenderer.send('notify', message);
	}
};

type DataCallback = (key: StreamKey, rows: DataType[], progress: Progress) => void;
const dataWrappers = new WeakMap<DataCallback, (_: unknown, args: { key: StreamKey, rows: DataType[], progress: Progress }) => void>();

/**
	* Defines the Renderer handlers
	*/
const renderer: Renderer = {
	stream: {
		/**
		 * Attaches a callback to be called when new data is available for a stream.
		 */
		onData: (callback) => {
			const wrapper = (_: unknown, args: {
				key: StreamKey,
				rows: DataType[],
				progress: Progress
			}) => {
				callback(args.key, args.rows, args.progress);
			};
			dataWrappers.set(callback, wrapper);
			ipcRenderer.on('stream:data', wrapper);
		},
		/**
		 * Removes a previously attached data callback.
		 */
		offData: (callback) => {
			const wrapper = dataWrappers.get(callback);
			if (wrapper) {
				ipcRenderer.removeListener('stream:data', wrapper);
				dataWrappers.delete(callback);
			}
		}
	}
};

contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('renderer', renderer);