import { contextBridge, ipcRenderer } from 'electron'

const isDev = process.env.NODE_ENV === 'development'

contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (extId: string, channel: string, payload?: unknown) =>
      ipcRenderer.invoke('ext:invoke', extId, channel, payload)
  },
  window: {
    resize: (width: number, height: number) =>
      ipcRenderer.send('window:resize', width, height),
    hide: () => ipcRenderer.send('window:hide'),
    esc: () => ipcRenderer.send('window:esc'),
    center: () => ipcRenderer.send('window:center'),
    dragStart: () => ipcRenderer.send('window:dragStart'),
    dragMove: () => ipcRenderer.send('window:dragMove'),
    dragEnd: () => ipcRenderer.send('window:dragEnd'),
    onShow: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('window-show', listener)
      return () => {
        ipcRenderer.off('window-show', listener)
      }
    }
  }
})
