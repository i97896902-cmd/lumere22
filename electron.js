import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let serverInitialized = false;

function startBackendServer() {
  if (serverInitialized) return;
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');

  if (fs.existsSync(serverPath)) {
    try {
      console.log('Initializing internal Express backend within Electron runtime from:', serverPath);
      // Run the server in-process using Electron's native Node.js runtime.
      // This completely removes dependency on an external "node" command in system PATH.
      require(serverPath);
      serverInitialized = true;
      console.log('Internal Express server started successfully.');
    } catch (err) {
      console.error('Error starting internal Express server:', err);
    }
  } else {
    console.warn('dist/server.cjs not found; application will run in static local mode.');
  }
}

function loadAppIntoWindow(win) {
  const serverUrl = 'http://localhost:3000';
  const localHtmlPath = path.join(__dirname, 'dist', 'index.html');

  // Quick check if the internal server is responding on port 3000
  const isServerResponding = () => {
    return new Promise((resolve) => {
      const req = http.get(serverUrl, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });
  };

  const attemptLoad = async () => {
    let ready = false;
    // Check up to 6 times (~1.5s max)
    for (let i = 0; i < 6; i++) {
      ready = await isServerResponding();
      if (ready) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    if (ready) {
      console.log('Loading app via local Express server:', serverUrl);
      win.loadURL(serverUrl).catch((err) => {
        console.warn('loadURL failed, falling back to local file:', err);
        win.loadFile(localHtmlPath);
      });
    } else {
      console.log('Local server not responding; loading local dist/index.html directly');
      if (fs.existsSync(localHtmlPath)) {
        win.loadFile(localHtmlPath).catch((err) => {
          console.error('Failed to load local index.html:', err);
        });
      } else {
        console.error('Neither server nor dist/index.html could be located.');
      }
    }
  };

  attemptLoad();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 768,
    title: "LUMÉRÉ ERP",
    backgroundColor: '#0b0c10', // Deep dark background prevents initial white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows relative ES module loading when using local files
    },
    autoHideMenuBar: true,
    show: false, // Show gracefully once ready
  });

  // Gracefully show window once ready to avoid visual glitches
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Automatically fallback to local index.html if network URL fails
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`did-fail-load (${errorCode}: ${errorDescription}) on ${validatedURL}`);
    const localHtmlPath = path.join(__dirname, 'dist', 'index.html');
    if (validatedURL.startsWith('http://localhost:3000') && fs.existsSync(localHtmlPath)) {
      console.log('Switching to local file fallback...');
      mainWindow.loadFile(localHtmlPath);
    }
  });

  // Press F12 or Ctrl+Shift+I to toggle DevTools if needed for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  loadAppIntoWindow(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
