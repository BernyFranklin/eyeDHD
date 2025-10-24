const { contextBridge, ipcRenderer } = require('electron')

// Defines functions available to the front end which run code on the back end
contextBridge.exposeInMainWorld('electron', {
    csv: {
        /**
         *
         */
        openFile: async (bufferSize) => {
            return await ipcRenderer.invoke('csv-open-file', bufferSize);
        },
        /**
         *
         */
        getRow: async (filename) => {
            const row = await ipcRenderer.invoke('csv-get-row', filename);
            return row;
        },
        /**
         *
         */
        getBuffer: async (filename) => {
            const buf = await ipcRenderer.invoke('csv-get-buffer', filename);
            return buf;
        }
    },
    notify: {
        /**
         *
         */
        send: (message) => {
            ipcRenderer.send('notify', message);
        }
    }
})
