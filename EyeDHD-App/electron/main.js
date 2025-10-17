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
}

app.whenReady().then(createWindow);


// Temporary data cleaning test

const cleaner = new DataCleaner(path.join(__dirname, '../../data/EyeData.csv'));
await cleaner.clean();

let frame = await cleaner.getCleanedRow();
while (frame !== null) {
    console.log(frame);

    frame = await cleaner.getCleanedRow()
}