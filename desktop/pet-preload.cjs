const { contextBridge, ipcRenderer } = require('electron')
if (process.isMainFrame && location.href === 'dsh-app://pet/index.html') {
  contextBridge.exposeInMainWorld('dshPetOverlay', {
    call: (action, body) => ipcRenderer.invoke('dsh-pet-v1:call', action, body),
    drag: phase => ipcRenderer.send('dsh-pet-v1:drag', phase),
    interactive: (value, regions) => ipcRenderer.send('dsh-pet-v1:interactive', value, regions),
    openMain: id => ipcRenderer.invoke('dsh-pet-v1:open-main', id),
    subscribe: (update, disconnected, retire) => {
      const onUpdate = (_event, state) => update(state)
      const onDisconnect = () => disconnected()
      const onRetire = () => retire()
      ipcRenderer.on('dsh-pet-v1:update', onUpdate)
      ipcRenderer.on('dsh-pet-v1:disconnected', onDisconnect)
      ipcRenderer.on('dsh-pet-v1:retire', onRetire)
      return () => {
        ipcRenderer.removeListener('dsh-pet-v1:update', onUpdate)
        ipcRenderer.removeListener('dsh-pet-v1:disconnected', onDisconnect)
        ipcRenderer.removeListener('dsh-pet-v1:retire', onRetire)
      }
    },
  })
}
