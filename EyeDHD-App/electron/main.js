import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'

import "./handlers.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 1280,
        minHeight:720,
        icon: path.join(__dirname, '../images/eyedhd-logo.ico'),
        title: 'EyeDHD',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist-electron/index.html'))
    }
}

app.whenReady().then(createWindow)