const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('companionTest', {
  configure: options => ipcRenderer.invoke('dsh-pet-v1:configure', options),
})
