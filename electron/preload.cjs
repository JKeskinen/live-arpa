const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('raffleAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  loadStream: url => ipcRenderer.invoke('stream:load', url),
  stopStream: () => ipcRenderer.invoke('stream:stop'),
  getState: () => ipcRenderer.invoke('stream:state'),
  onUpdate: callback => { const fn = (_e, data) => callback(data); ipcRenderer.on('state:update', fn); return () => ipcRenderer.removeListener('state:update', fn); },
  onError: callback => { const fn = (_e, message) => callback(message); ipcRenderer.on('state:error', fn); return () => ipcRenderer.removeListener('state:error', fn); }
});
