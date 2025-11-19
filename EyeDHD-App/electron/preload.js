const { contextBridge, ipcRenderer } = require('electron');

/**
 * Defines requests that the frontend can send to the backend
 *
 * available as an object in the frontend called: electron
 */
contextBridge.exposeInMainWorld('electron', {
    csv: {
        /**
         * Requests for a csv file to be opened and cleaned
         *
         * @returns filename of file opened or null if cancelled
         */
        openFile: async (bufferSize) => {
            return await ipcRenderer.invoke('csv-open-file', bufferSize);
        },
        /**
         * Requests for a csv file to be closed
         */
        closeFile: async (filename) => {
            return await ipcRenderer.invoke('csv-close-file', filename);
        },
        /**
         * Requests the buffer stored in the data cleaner, triggers the buffer
         * to be refilled as well
         *
         * @returns an array of rows, or null if the entire file has been read
         */
        getBuffer: async (filename) => {
            return await ipcRenderer.invoke('csv-get-buffer', filename);
        },
        /**
         * Initiates data cleaning process for the specified file
         *
         * @param filename - The name of the file to clean
         * @returns Promise with success status and message
         */
        cleanData: async (filename) => {
            return await ipcRenderer.invoke('csv-clean-data', filename);
        },
        /**
         * Gets current cleaning statistics for the specified file
         *
         * @param filename - The name of the file to get stats for
         * @returns Object containing stats, performance metrics, and status
         */
        getStats: async (filename) => {
            return await ipcRenderer.invoke('csv-get-stats', filename);
        },
        /**
         * Gets current cleaning progress for the specified file
         *
         * @param filename - The name of the file to get progress for
         * @returns Object containing progress information
         */
        getProgress: async (filename) => {
            return await ipcRenderer.invoke('csv-get-progress', filename);
        }
    },
    notify: {
        /**
         * Creates an OS notification displaying the argument: message
         */
        send: (message) => {
            ipcRenderer.send('notify', message);
        }
    },
    db: {
        selectAll : async () => await ipcRenderer.invoke('db-select-all'),
        importCsv : async () => await ipcRenderer.invoke('db-import-csv'),
    }
})
