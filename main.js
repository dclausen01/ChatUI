const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

// Keep a global reference of the window object
async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: app.isPackaged 
        ? path.join(process.resourcesPath, 'app', 'preload.js')
        : path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.svg'),
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  try {
    // Start the backend server and wait for it to be ready
    await startBackend();
    console.log('Backend is ready, loading frontend...');

    // Load the frontend
    if (isDev) {
      // In development, load from the dev server
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      // In production, load the built frontend files directly
      const isPackaged = app.isPackaged;
      let frontendPath;
      
      if (isPackaged) {
        // In packaged app, frontend is in the asar archive
        frontendPath = path.join(process.resourcesPath, 'app.asar', 'frontend', 'dist', 'index.html');
      } else {
        // In development, frontend is relative to main.js
        frontendPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
      }
      
      console.log('Loading frontend from:', frontendPath);
      mainWindow.loadFile(frontendPath);
    }
  } catch (error) {
    console.error('Failed to start backend:', error);
    // Show error dialog or load a local error page
    mainWindow.loadURL('data:text/html,<h1>Error starting backend</h1><p>' + error.message + '</p>');
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    // In production builds, the backend files are in a different location
    const isPackaged = app.isPackaged;
    let backendPath, backendCwd;
    
    if (isPackaged) {
      // In packaged app, backend is in resources/app.asar.unpacked/backend
      backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js');
      backendCwd = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
      
      // Set NODE_PATH to include the extraResources node_modules
      const extraNodeModules = path.join(process.resourcesPath, 'backend', 'node_modules');
      process.env.NODE_PATH = extraNodeModules + (process.env.NODE_PATH ? ':' + process.env.NODE_PATH : '');
    } else {
      // In development, backend is relative to main.js
      backendPath = path.join(__dirname, 'backend', 'server.js');
      backendCwd = path.join(__dirname, 'backend');
    }
    
    console.log('Starting backend from:', backendPath);
    console.log('Backend working directory:', backendCwd);
    
    backendProcess = spawn('node', [backendPath], {
      cwd: backendCwd,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      // Check if server is ready
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      reject(new Error(`Backend exited with code ${code}`));
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Backend startup timeout'));
    }, 10000);
  });
}

function createMenu() {
  const template = [
    {
      label: 'ChatUI',
      submenu: [
        {
          label: 'About ChatUI',
          click: () => {
            shell.openExternal('https://github.com/your-username/chatui');
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
