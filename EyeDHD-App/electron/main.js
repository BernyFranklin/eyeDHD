import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

import DataCleaner from './DataCleaner.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, '../../public/eyedhd-logo.png'),
        webPreferences: {
            contextIsolation: true,
        },
    });

    win.loadURL('http://localhost:5173');

    win.on('closed', () => {
        app.quit();
    });
}

app.whenReady().then(createWindow);

const cleaner = new DataCleaner(path.join(__dirname, '../../data/EyeData.csv'))
const data = await cleaner.run()

console.log(data)