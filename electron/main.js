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
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

// Set up logger for updater
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

function setupAutoUpdater() {
  const sendStatusToWindow = (type, data) => {
    if (mainWindow) {
      mainWindow.webContents.send('updater:message', { type, data });
    }
  };

  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update...');
    sendStatusToWindow('checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update available:', info.version);
    sendStatusToWindow('available', info);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Found',
      message: `A new version (${info.version}) is available. It is downloading now.`,
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('[Updater] Update not available. Current version:', app.getVersion());
    sendStatusToWindow('latest', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err);
    sendStatusToWindow('error', err.message || err);
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'The auto-updater encountered an error: ' + (err.message || err),
        buttons: ['Dismiss']
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const log_message = `Download speed: ${(progressObj.bytesPerSecond / 1024).toFixed(2)} KB/s - Downloaded ${progressObj.percent.toFixed(2)}%`;
    log.info('[Updater]', log_message);
    sendStatusToWindow('progress', progressObj);
    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Update downloaded');
    if (mainWindow) mainWindow.setProgressBar(-1);
    sendStatusToWindow('downloaded', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Restart and Install', 'Later'],
      defaultId: 0,
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded and is ready to install. Restart the app to apply the update?`,
    }).then((result) => {
      if (result.response === 0) {
        log.info('[Updater] User chose to restart and install');
        setImmediate(() => autoUpdater.quitAndInstall());
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

ipcMain.on('updater:check', () => {
  autoUpdater.checkForUpdates();
});

ipcMain.on('updater:quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});

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
