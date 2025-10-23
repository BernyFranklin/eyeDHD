import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    },
  });

  win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);
