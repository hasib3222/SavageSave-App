// Electron main process
// - Creates the BrowserWindow
// - Boots the embedded Express backend (download engine API)
// - Exposes native features via IPC (dialog, notifications, clipboard)

const { app, BrowserWindow, ipcMain, dialog, Notification, clipboard, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { startBackend } = require('../backend/server');

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. It is being downloaded in the background.`,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Update not available.');
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ")";
    console.log('[Updater]', log_message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded');
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded and is ready to install. Restart now?`,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}

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

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  // Check for updates after a short delay to allow app to settle
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
