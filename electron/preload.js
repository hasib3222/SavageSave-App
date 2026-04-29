// Preload: safely expose a limited API to the renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),
  notify: (payload) => ipcRenderer.invoke('notify', payload),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:showInFolder', p),
  getApiPort: () => ipcRenderer.invoke('app:getApiPort'),
  checkForUpdates: () => ipcRenderer.send('updater:check'),
  quitAndInstall: () => ipcRenderer.send('updater:quitAndInstall'),
  onUpdateMessage: (callback) => {
    const listener = (_evt, ...args) => callback(...args);
    ipcRenderer.on('updater:message', listener);
    return () => ipcRenderer.removeListener('updater:message', listener);
  },
});
