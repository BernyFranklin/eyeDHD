import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';

import './handlers.ts';

function createWindow() {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		minWidth: 100,
		minHeight: 20,
		frame: false,
		icon: path.join(__dirname, '../images/sight-logo.ico'),
		title: 'EyeDHD',
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			preload: path.join(__dirname, 'preload.js'),
			webSecurity: false
		}
	});

	win.on('maximize', () => win.webContents.send('window:maximize-changed', true));
	win.on('unmaximize', () => win.webContents.send('window:maximize-changed', false));

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		win.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
		);
	}
}

ipcMain.on('window:minimize', (event) => {
	BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window:maximize', (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win?.isMaximized()) {
		win.unmaximize();
	} else {
		win?.maximize();
	}
});

ipcMain.on('window:close', (event) => {
	BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('window:is-maximized', (event) => {
	return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

ipcMain.on('menu:action', (event, action: string) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	const wc = event.sender;
	switch (action) {
		case 'quit': app.quit(); break;
		case 'undo': wc.undo(); break;
		case 'redo': wc.redo(); break;
		case 'cut': wc.cut(); break;
		case 'copy': wc.copy(); break;
		case 'paste': wc.paste(); break;
		case 'select-all': wc.selectAll(); break;
		case 'reload': wc.reload(); break;
		case 'force-reload': wc.reloadIgnoringCache(); break;
		case 'toggle-devtools': wc.toggleDevTools(); break;
		case 'actual-size': wc.setZoomLevel(0); break;
		case 'zoom-in': wc.setZoomLevel(wc.getZoomLevel() + 0.5); break;
		case 'zoom-out': wc.setZoomLevel(wc.getZoomLevel() - 0.5); break;
		case 'toggle-fullscreen': win?.setFullScreen(!win.isFullScreen()); break;
		case 'window-minimize': win?.minimize(); break;
		case 'window-maximize': win?.isMaximized() ? win.unmaximize() : win?.maximize(); break;
		case 'window-close': win?.close(); break;
		case 'about':
			dialog.showMessageBox(win!, {
				type: 'info',
				title: 'EyeDHD',
				message: 'EyeDHD',
				detail: 'Eye tracking analysis tool for ADHD research.\n\nDeveloped at Fresno State.'
			});
			break;
	}
});

app.whenReady().then(createWindow);
