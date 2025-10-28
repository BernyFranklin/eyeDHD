// animation_prototype/electron/preload.cjs  (UTF-8)
const { contextBridge, ipcRenderer } = require('electron')

console.log('[preload] loaded (CJS, UTF-8)')

contextBridge.exposeInMainWorld('csv', {
  ping: () => 'pong',
  openDialog: () => ipcRenderer.invoke('dialog:openCsv'),
  start: (path, opts) => ipcRenderer.invoke('csv:start', path, opts),
  onChunk: (fn) => ipcRenderer.on('csv:chunk', (_e, rows) => fn(rows)),
  onDone: (fn) => ipcRenderer.on('csv:done', (_e, info) => fn(info)),
  onError: (fn) => ipcRenderer.on('csv:error', (_e, err) => fn(err)),
})
