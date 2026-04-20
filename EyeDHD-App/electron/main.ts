import { app, BrowserWindow } from 'electron';
import path from 'path';

import './handlers.ts';

function createWindow() {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		minWidth: 100,
		minHeight: 20,
		icon: path.join(__dirname, '../images/sight-logo.ico'),
		title: 'EyeDHD',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: path.join(__dirname, 'preload.js'),
			webSecurity: false
		}
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		win.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
		);
	}
}

app.whenReady().then(createWindow);
