import { dialog, ipcMain, Notification } from 'electron'
import path from 'path'

import { filesMap } from './store.js'
import DataCleaner from './stuff/DataCleaner.js'

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

ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show()
})