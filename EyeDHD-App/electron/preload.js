const { contextBridge, ipcRenderer } = require('electron')

// Defines functions available to the front end which run code on the back end
contextBridge.exposeInMainWorld('electron', {
    csv: {
        /**
         * Opens a file-selector and returns the filename if a file is selected
         * and begins cleaning that file asynchoronously,
         * otherwise returns null if canceled
         *
         * Example code:
         * ```js
         * const handleClick = async () => {
         *     const filename = await electron.csv.openFile()
         * }
         * ```
         */
        openFile: async () => {
            return await ipcRenderer.invoke('csv-open-file')
        },
        /**
         * Requests a cleaned row from filename, returns a promise resolving to
         * the row if data is available, and null if the end of file has been reached.
         * Rejects if the file has not been opened
         *
         * Example code:
         * ```js
         * const row = await electron.csv.getCleanedRow(filename)
         * if (!row) {
         *     // End of file has been reached
         * }
         * ```
         */
        getCleanedRow: async (filename) => {
            const row = await ipcRenderer.invoke('csv-get-cleaned-row', filename)
            return row
        }
    },
    notify: {
        /** 
         * Creates an OS notification displaying the message passed in
         *
         * Example code:
         * ```js
         * electron.notify.send("This is a notification")
         * ```
         */
        send: (message) => {
            ipcRenderer.send('notify', message)
        }
    }
})
