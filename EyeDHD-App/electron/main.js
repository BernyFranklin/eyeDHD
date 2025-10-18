import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, '../../assets/eyedhd-logo.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist-electron/index.html'))
    }
}

app.whenReady().then(createWindow)

// Temporary data cleaning test

//const cleaner = new DataCleaner(path.join(__dirname, '../../data/EyeData.csv'))
//cleaner.clean()

//let frame = await cleaner.getCleanedRow()
//while (frame !== null) {
//    console.log(frame)

//    frame = await cleaner.getCleanedRow()
//}
