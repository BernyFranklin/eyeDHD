import { dialog, ipcMain, Notification } from 'electron'
import path from 'path'

import { filesMap } from './store.js'
import DataCleaner from './stuff/DataCleaner.js'

/**
 * Handles the csv-open-file request. Opens a file selector and begins cleaning it if one is selected
 *
 * @returns filename if a file is selector, or null if none are selected
 */
ipcMain.handle('csv-open-file', async (_, bufferSize) => {
    return new Promise(async (resolve, reject) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        })

        if (canceled) {
            return resolve(null)
        }

        const filepath = filePaths[0]
        const filename = path.basename(filepath)

        if (filesMap.has(filename)) {
            return reject(`File: ${filename} already opened`)
        }

        const cleaner = new DataCleaner({
            path: filepath,
            buf_len: bufferSize
        })

        filesMap.set(filename, cleaner)
        return resolve(filename)
    })
})

/**
 * Handles the csv-get-row request. Reads a row from filename's cleaner
 *
 * @returns a cleaned row, or null if the entire file has been read
 */
ipcMain.handle('csv-get-row', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`)
        }

        const row = await cleaner.getRow()
        return resolve(row)
    })
})

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`)
        }

        const buf = await cleaner.getBuffer()
        return resolve(buf)
    })
})

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show()
})