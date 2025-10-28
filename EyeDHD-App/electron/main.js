import { app, ipcMain, BrowserWindow, Notification } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'

import DataCleaner from './DataCleaner.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filesMap = new Map()

function createWindow() {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
    minWidth: 1280,
    minHeight:720,
    icon: path.join(__dirname, '../images/eyedhd-logo.ico'),
    title: 'EyeDHD',
        icon: path.join(__dirname, '../../assets/eyedhd-logo.png'),
        //titleBarStyle: 'hidden',
        //...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist-electron/index.html'))
    }
}

// Message Handlers

// Opens a file-selector and returns the filename if a file is selected
// and begins cleaning that file asynchoronously,
// returns null if canceled if no file selected
ipcMain.handle('csv-open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (canceled) {
        return null
    }

    const filepath = filePaths[0]
    const filename = path.basename(filepath)

    if (files.has(filename)) {
        return console.log(`File: ${filename} already opened`)
    }

    const cleaner = new DataCleaner(filepath)
    cleaner.start()

    filesMap.set(filename, cleaner)
    return filename
})

// Grabs a cleaned row from filename, returns a promise resolving to
// the row if data is available, and null if the end of file has been reached.
// Rejects if the file has not been opened
ipcMain.handle('csv-get-cleaned-row', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const file = filesMap.get(filename) || null;
        if (!file) {
            return reject(`File: ${filename} has not been opened`)
        }

        const row = await file.getCleanedRow()
        return resolve(row)
    })
})

// Creates a OS notification with the message passed in
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show()
})

app.whenReady().then(createWindow)

// Temporary data cleaning test

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const cleaner = new DataCleaner(path.join(__dirname, '../../data/EyeData.csv'))
cleaner.start()

await sleep(10)

try {
    let row = await cleaner.getCleanedRow()
    while (row !== null) {
        console.log(row)

        row = await cleaner.getCleanedRow()
    }
    console.log("all rows read")
} catch (_) {
    console.log("oops")
}