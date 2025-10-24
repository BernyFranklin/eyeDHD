const { contextBridge, ipcRenderer } = require('electron')

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
         * Requests an individual row from the data cleaner
         *
         * @returns a cleaned row or null if the entire file has been read
         */
        getRow: async (filename) => {
            return await ipcRenderer.invoke('csv-get-row', filename);
        },
        /**
         * Requests the buffer stored in the data cleaner, triggers the buffer
         * to be refilled as well
         *
         * @returns an array of rows, or null if the entire file has been read
         */
        getBuffer: async (filename) => {
            return await ipcRenderer.invoke('csv-get-buffer', filename);
        }
    },
    notify: {
        /**
         * Creates an OS notification displaying the argument: message
         */
        send: (message) => {
            ipcRenderer.send('notify', message);
        }
    }
})
