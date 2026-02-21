import { contextBridge, ipcRenderer } from 'electron';

import { type Metadata } from './db/tables/metadata';
import { type Progress, type DataType, type StreamKey, type StreamType } from './db/DataStream';

export { Electron, Renderer };

/**
 * Declares the API that the backend exposes to the frontend through the preload script
 */
declare interface Electron {
	csv: {
		openFile(): Promise<Metadata | null>;
		readMetadata(filename: string): Promise<Metadata>;
		resetCleaningProgress(file: Metadata): Promise<void>;
		cleanData(file: Metadata): Promise<void>;
		exportData(file: Metadata): Promise<{
			success: boolean,
			message: string,
			stats: {
				totalExported: number,
				filePath: string,
				fileSize: number
			}
		}>;
	};

	video: {
		selectFile(): Promise<string | null>;
		SidebySide(vrFile: string, animFile: string, offsetSeconds: number): Promise<string>;
		toVideoURL(filePath: string | null): string | null;
	};

	stream: {
		start(type: StreamType, file?: Metadata): Promise<StreamKey>;
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
	csv: {
		/**
		 * Requests for a csv file to be opened and cleaned
		 *
		 * @returns filename of file opened or null if cancelled
		 */
		openFile: async (): Promise<Metadata | null> => {
			return await ipcRenderer.invoke('csv:open-file');
		},
		/**
		 * Reads the metadata for a given file.
		 */
		readMetadata: async (filename: string): Promise<Metadata> => {
			return await ipcRenderer.invoke('csv:read-metadata', filename);
		},

		/**
		 * Resets the cleaning progress of a file, allowing it to be cleaned
		 * again from the start.
		 */
		resetCleaningProgress: async (file: Metadata): Promise<void> => {
			return await ipcRenderer.invoke('csv:reset-cleaning-progress', file);
		},
		/**
		 * Initiates data cleaning process for the specified file
		 *
		 * @param filename - The name of the file to clean
		 * @returns Promise with success status and message
		 */
		cleanData: async (file: Metadata) => {
			return await ipcRenderer.invoke('csv:clean-data', file);
		},
		/**
		 * Exports cleaned CSV data to a new file
		 *
		 * @param filename - The name of the file to export
		 * @returns Promise with export result
		 */
		exportData: async (file: Metadata) => {
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
		toVideoURL: (filePath: string) => {
			if (!filePath) return null;
			const normalized = filePath.replace(/\\/g, '/');
			// avoid double prefixing if it already starts with file:///
			return normalized.startsWith('file:///') ? normalized : `file:///${normalized}`;
		}
	},

	stream: {
		/**
		 * Starts a new stream of the specified type, optionally associated with a file.
		 */
		start: async (type: StreamType, file?: Metadata): Promise<StreamKey> => {
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