const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the frontend here
  // For now, we'll keep it minimal since the app works through HTTP
  platform: process.platform,
  version: process.versions.electron,
  // Dark mode toggle
  onToggleDarkMode: (callback) => ipcRenderer.on('toggle-dark-mode', (event) => callback())
});
