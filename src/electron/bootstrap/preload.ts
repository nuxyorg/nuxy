import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (extId: string, channel: string, payload?: unknown) =>
      ipcRenderer.invoke('ext:invoke', extId, channel, payload),
  },
  window: {
    resize: (width: number, height: number) => ipcRenderer.send('window:resize', width, height),
    hide: () => ipcRenderer.send('window:hide'),
    esc: () => ipcRenderer.send('window:esc'),
    center: () => ipcRenderer.send('window:center'),
    dragStart: () => ipcRenderer.send('window:drag-start'),
    dragMove: () => ipcRenderer.send('window:drag-move'),
    dragEnd: () => ipcRenderer.send('window:drag-end'),
    onShow: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('window:show', listener)
      return () => {
        ipcRenderer.off('window:show', listener)
      }
    },
  },
  icons: {
    get: (name: string, pack?: string) =>
      ipcRenderer.invoke('ext:invoke', 'kernel', 'getIcon', { name, pack }),
    listPacks: () => ipcRenderer.invoke('ext:invoke', 'kernel', 'listIconPacks', {}),
  },
  themes: {
    list: () => ipcRenderer.invoke('ext:invoke', 'kernel', 'listThemes', {}),
  },
})
