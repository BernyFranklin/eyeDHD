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
    openFile: async (request_size) => {
      return await ipcRenderer.invoke('csv-open-file', request_size);
    },
    resetReadingProgress: async (filename) => {
      return await ipcRenderer.invoke('csv-reset-reading-progress', filename);
    },
    resetCleaningProgress: async (filename) => {
      return await ipcRenderer.invoke('csv-reset-cleaning-progress', filename);
    },
    getMetadata: async (filename) => {
      return await ipcRenderer.invoke('csv-get-metadata', filename);
    },
    // gets the list of opened files
    getFileList: async () => {
      return await ipcRenderer.invoke('csv-get-file-list');
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
    // Returns { first, last }
    getFirstAndLast: async (filename) => {
      return await ipcRenderer.invoke('csv-get-first-and-last', filename);
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
    },
    /**
     * Exports cleaned CSV data to a new file
     *
     * @param filename - The name of the file to export
     * @returns Promise with export result
     */
    exportData: async (filename) => {
      return await ipcRenderer.invoke('csv-export-data', filename);
    },
    /**
     * Saves binary data to a file with save dialog
     *
     * @param options - Save options (defaultPath, filters, data)
     * @returns Promise with save result
     */
    saveFile: async (options) => {
      return await ipcRenderer.invoke('csv-save-file', options);
    }
  },
  animation: {
    /**
     * Initialize a new animation export session
     *
     * @param options - Export options (fileName, format, quality)
     * @returns Promise with session ID and export path
     */
    exportInit: async (options) => {
      return await ipcRenderer.invoke('animation-export-init', options);
    },
    /**
     * Add frame data to the current export session
     *
     * @param sessionId - The export session ID
     * @param frameData - Frame data object with frameIndex, frameData, timestamp
     * @returns Promise with success status
     */
    exportAddFrame: async (sessionId, frameData) => {
      return await ipcRenderer.invoke('animation-export-add-frame', sessionId, frameData);
    },
    /**
     * Finalize the export and create video/image sequence
     *
     * @param sessionId - The export session ID
     * @returns Promise with export result
     */
    exportFinalize: async (sessionId) => {
      return await ipcRenderer.invoke('animation-export-finalize', sessionId);
    },
    /**
     * Get progress of the current export session
     *
     * @param sessionId - The export session ID
     * @returns Promise with progress information
     */
    exportProgress: async (sessionId) => {
      return await ipcRenderer.invoke('animation-export-progress', sessionId);
    },
    /**
     * Cancel the current export session
     *
     * @param sessionId - The export session ID
     * @returns Promise with cancellation result
     */
    exportCancel: async (sessionId) => {
      return await ipcRenderer.invoke('animation-export-cancel', sessionId);
    }
  },
  notify: (message) => {
    ipcRenderer.send('notify', message);
  }
});
