// Electron main process
// - Creates the BrowserWindow
// - Boots the embedded Express backend (download engine API)
// - Exposes native features via IPC (dialog, notifications, clipboard)

const { app, BrowserWindow, ipcMain, dialog, Notification, clipboard, shell } = require('electron');
const path = require('path');
const { startBackend } = require('../backend/server');

// Read version from package.json (single source)
const pkg = require('../package.json');
const APP_VERSION = pkg.version || '1.0.0';

if (process.platform === 'win32') {
  app.setAppUserModelId('com.savagesave.desktop');
}

let mainWindow;
let backendPort = 0;

async function createWindow() {
  // Start embedded backend on a random port first
  const { port } = await startBackend();
  backendPort = port;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b0f1a',
    title: 'SavageSave',
    frame: true,
    icon: path.join(__dirname, '..', 'icon', 'savagesave.ico'), // Electron auto-converts to ICO for Windows taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Inject backend port into renderer via a query param
  const devUrl = `http://localhost:5173/?apiPort=${backendPort}`;
  const prodFile = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(prodFile, { query: { apiPort: String(backendPort) } });
  }
}

// --- IPC handlers for native integrations ---

// Ask user to pick a download folder
ipcMain.handle('dialog:chooseFolder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return res.canceled ? null : res.filePaths[0];
});

// Show OS notification
ipcMain.handle('notify', (_evt, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Clipboard read (used by clipboard monitor in renderer)
ipcMain.handle('clipboard:read', () => clipboard.readText());

// Open a file / folder in the OS
ipcMain.handle('shell:openPath', (_evt, p) => shell.openPath(p));
ipcMain.handle('shell:showInFolder', (_evt, p) => shell.showItemInFolder(p));

// Expose backend port (renderer can query it explicitly)
ipcMain.handle('app:getApiPort', () => backendPort);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
