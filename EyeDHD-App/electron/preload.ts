import { contextBridge, ipcRenderer } from 'electron';

import { type UserData } from './db/tables/UserData';
import { type CaseData } from './db/tables/CaseData';
import { type Progress, type DataType, type StreamKey, type StreamType } from './db/DataStream';

export { Electron, Renderer, DetectionResult };

type ProjectDir = {
	dir?: string,
	status: {
		empty: boolean
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
		selectCsv(): Promise<string | null>;
		importCsv(trial: CaseData, filepath: string): Promise<CaseData>;
		runDetection(trial: CaseData): Promise<DetectionResult>;
		startFFMPEG(trial: CaseData, size: {
			width: number;
			height: number;
		}): void;
		stopFFMPEG(trial: CaseData): Promise<void>;
		saveAnimation(trial: CaseData, frames: Uint8Array[], size: {
			width: number;
			height: number;
		}): Promise<void>;
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
	}
}

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
		 * Runs the saccade detection pipeline on the cleaned CSV for the given case
		 * and writes analysis CSVs and metadata JSONs to the case outputs directory.
		 */
		runDetection: async (trial: CaseData): Promise<DetectionResult> => {
			return await ipcRenderer.invoke('case:run-detection', trial);
		},
		startFFMPEG: (trial: CaseData, size) => {
			return ipcRenderer.send('case:start-ffmpeg', trial, size);
		},
		stopFFMPEG: async (trial: CaseData): Promise<void> => {
			return await ipcRenderer.invoke('case:stop-ffmpeg', trial);
		},
		saveAnimation: async (trial: CaseData, frames: Uint8Array[], size) => {
			return await ipcRenderer.invoke('case:save-animation', trial, frames, size);
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

/**
	* Defines the Renderer handlers
	*/
const renderer: Renderer = {
	stream: {
		/**
		 * Attaches a callback to be called when new data is available for a stream.
		 */
		onData: (callback) => {
			ipcRenderer.on('stream:data', (_, args: {
				key: StreamKey,
				rows: DataType[],
				progress: Progress
			}) => {
				callback(args.key, args.rows, args.progress);
			});
		}
	}
};

contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('renderer', renderer);