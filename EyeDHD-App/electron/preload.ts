import { contextBridge, ipcRenderer } from 'electron';

import { type Metadata } from './db/tables/metadata';
import { type DataType, type StreamKey, type StreamType } from './db/DatabaseManager';

export { Electron, Renderer };

console.log('Preload script loaded, exposing API to renderer process');

/**
 * Defines the API that the backend exposes to the frontend through the preload script
 *
 * Must make sure this matches API matched in backend
 */
declare interface Electron {
  csv: {
    openFile(): Promise<Metadata | null>;
    getFileList(): Promise<Metadata[] | null>;
    getCleanedFileList(): Promise<Metadata[] | null>;
    resetCleaningProgress(file: Metadata): Promise<void>;
    cleanData(file: Metadata): Promise<void>;
    exportData(file: Metadata): Promise<void>;
  };

  video: {
    selectFile(): Promise<string | null>;
    SidebySide(vrFile: string, animFile: string, offsetSeconds: number): Promise<any>;
    toVideoURL(filePath: string | null): string | null;
  };

  stream: {
  	start(type: StreamType, file?: Metadata): Promise<StreamKey>;
   	pull(key: StreamKey, count: number): Promise<void>;
   	cancel(key: StreamKey): void;
  }

  notify(message: string): void;
}

/**
 * Defines the API that the front uses to react to messages
 * from the backend through the preload script
 */
declare interface Renderer {
	stream: {
		onData(callback: (key: StreamKey, rows: DataType[]) => void): void;
		onEnd(callback: (key: StreamKey) => void): void;
	}
}

/**
	* Defines requests that the frontend can send to the backend
	*
	* available as an object in the frontend called: electron
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
			* Resets the cleaning progress of a file, allowing it to be cleaned again from the start.
			*/
		resetCleaningProgress: async (file: Metadata): Promise<void> => {
			return await ipcRenderer.invoke('csv:reset-cleaning-progress', file);
		},
		/**
			* Gets the list of all files that have been opened.
			* @returns the list, or null if no files have been opened.
			*/
		getFileList: async (): Promise<Metadata[] | null> => {
			return await ipcRenderer.invoke('csv:get-file-list');
		},
		/**
			* Gets the list of all files that have been opened and cleaned.
			* @returns the list, or null if no files have been opened.
			*/
		getCleanedFileList: async (): Promise<Metadata[] | null> => {
			return await ipcRenderer.invoke('csv:get-cleaned-file-list');
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
			*open a native dialog to choose a video file and return full path
			*/
		selectFile: async () => {
			return await ipcRenderer.invoke('vr:select-video-file');
		},
		/**
			*sync vr + animation using main.js ffmpeg handler
			*/
		SidebySide: async (vrFile: string, animFile: string, offsetSeconds: number) => {
			return await ipcRenderer.invoke('vr:video-sync-vr', {
				vrFile,
				animFile,
				offsetSeconds
			});
		},
		/* convert OS path → safe video URL for <video src="">
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
			*
			*/
		start: async (type: StreamType, file?: Metadata): Promise<StreamKey> => {
			return await ipcRenderer.invoke('stream:start', { type, file })
		},
		/**
			*
			*/
		pull: async (key: StreamKey, count: number): Promise<void> => {
			return await ipcRenderer.invoke('stream:pull', { key, count });
		},
		/**
			*
			*/
		cancel: (key: StreamKey) => {
			ipcRenderer.send('stream:cancel', { key });
		}
	},
	/**
		*
		*/
	notify: (message: string) => {
		ipcRenderer.send('notify', message);
	}
};

/**
	* Exposes APIs for the backend to send data/events to the frontend
	*/
const renderer: Renderer = {
	stream: {
		/**
			*
			*/
		onData: (callback: (key: StreamKey, rows: DataType[]) => void) => {
			ipcRenderer.on('stream:data', (_, args: { key: StreamKey, rows: DataType[] }) => {
				callback(args.key, args.rows);
			});
		},
		/**
			*
			*/
		onEnd: (callback: (key: StreamKey) => void) => {
			ipcRenderer.on('stream:end', (_, { key }) => {
				callback(key);
			});
		}
	}
};

contextBridge.exposeInMainWorld('electron', electron);
contextBridge.exposeInMainWorld('renderer', renderer);