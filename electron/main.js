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

// CRITICAL: Disable signature verification for unsigned indie builds
// This prevents "New version is not signed by the application owner" error on Windows
autoUpdater.isValidatorEnabled = false;

// Set up logger for updater
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

function setupAutoUpdater() {
  const sendStatusToWindow = (type, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:message', { type, data });
    }
  };

  // Clean stale updates before starting check
  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for updates start...');
    sendStatusToWindow('checking', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update found:', info.version);
    sendStatusToWindow('available', info);
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'SavageSave Update Found',
        message: `New version v${info.version} found. Downloading in the background...`,
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('[Updater] No update. Current version:', app.getVersion());
    sendStatusToWindow('latest', 'You are using latest version.');
  });

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Sync error:', err);
    
    let errorMsg = 'Could not check for updates. Please try again later.';
    const msg = String(err.message || err).toLowerCase();

    if (msg.includes('net::err_internet_disconnected') || msg.includes('dns_probe_finished')) {
      errorMsg = 'Check your internet connection.';
    } else if (msg.includes('404')) {
      errorMsg = 'Update server temporarily unavailable.';
    } else if (msg.includes('not signed') || msg.includes('signature mismatch')) {
      errorMsg = 'Update validation failed. Please download manually.';
      log.error('[Updater] Signature block detected despite bypass. Manual intervention may be needed.');
    }

    sendStatusToWindow('error', errorMsg);
    
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: errorMsg,
        buttons: ['Dismiss']
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    log.info(`[Updater] Downloading: ${percent}%`);
    sendStatusToWindow('progress', progressObj);
    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Download complete. Version:', info.version);
    if (mainWindow) mainWindow.setProgressBar(-1);
    sendStatusToWindow('downloaded', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Restart & Install', 'Later'],
      defaultId: 0,
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded and is ready to install. Restart the app to apply the update now?`,
    }).then((result) => {
      if (result.response === 0) {
        log.info('[Updater] User chose Restart & Install. Closing all windows...');
        // Close all windows except main to ensure clean exit
        BrowserWindow.getAllWindows().forEach(w => {
          if (w !== mainWindow) w.close();
        });
        
        setImmediate(() => {
          app.removeAllListeners('window-all-closed');
          autoUpdater.quitAndInstall(false, true);
        });
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
