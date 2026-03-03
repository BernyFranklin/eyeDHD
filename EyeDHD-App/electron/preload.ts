import { contextBridge, ipcRenderer } from 'electron';

import { type UserData } from './db/tables/UserData';
import { type CaseData } from './db/tables/CaseData';
import { type Progress, type DataType, type StreamKey, type StreamType } from './db/DataStream';

export { Electron, Renderer };

type ProjectDir = {
	dir?: string,
	status: {
		empty: boolean
	}
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
		read(filename: string): Promise<CaseData>;
		selectCsv(): Promise<string | null>;
		importCsv(file: CaseData, filepath: string): Promise<CaseData>;
	};

	csv: {
		resetCleaningProgress(file: CaseData): Promise<void>;
		cleanData(file: CaseData): Promise<void>;
		exportData(file: CaseData): Promise<void>;
	};

	video: {
		selectFile(): Promise<string | null>;
		SidebySide(vrFile: string, animFile: string, offsetSeconds: number): Promise<string>;
		toVideoURL(filename: string | null): string | null;
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
		importCsv: async (file: CaseData, filepath: string): Promise<CaseData> => {
			return await ipcRenderer.invoke('case:import-csv', file, filepath);
		}
	},

	csv: {

		/**
		 * Resets the cleaning progress of a file, allowing it to be cleaned
		 * again from the start.
		 */
		resetCleaningProgress: async (file: CaseData): Promise<void> => {
			return await ipcRenderer.invoke('csv:reset-cleaning-progress', file);
		},
		/**
		 * Initiates data cleaning process for the specified file
		 */
		cleanData: async (file: CaseData) => {
			return await ipcRenderer.invoke('csv:clean-data', file);
		},
		/**
		 * Exports cleaned CSV data to a new file
		 */
		exportData: async (file: CaseData) => {
			return await ipcRenderer.invoke('csv:export-data', file);
		}
	},

	video: {
		/**
		 * open a native dialog to choose a video file and return full path
		 */
		selectFile: async () => {
			return await ipcRenderer.invoke('vr:select-video-file');
		},
		/**
		 * sync vr + animation using main.js ffmpeg handler
		 */
		SidebySide: async (vrFile: string, animFile: string, offsetSeconds: number) => {
			return await ipcRenderer.invoke('vr:video-sync-vr', {
				vrFile,
				animFile,
				offsetSeconds
			});
		},
		/**
		 * convert OS path → safe video URL for <video src="">
		 * no Node 'path' module used so bundlers can't complain
		 */
		toVideoURL: (filepath: string) => {
			if (!filepath) return null;
			const normalized = filepath.replace(/\\/g, '/');
			// avoid double prefixing if it already starts with file:///
			return normalized.startsWith('file:///') ? normalized : `file:///${normalized}`;
		}
	},

	stream: {
		/**
		 * Starts a new stream of the specified type, optionally associated with a file.
		 */
		start: async (type: StreamType, file?: CaseData): Promise<StreamKey> => {
			return await ipcRenderer.invoke('stream:start', { type, file })
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