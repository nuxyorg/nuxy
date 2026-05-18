import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (extId: string, channel: string, payload: any) => 
      ipcRenderer.invoke('ext:invoke', extId, channel, payload)
  },
  window: {
    resize: (width: number, height: number) => ipcRenderer.send('window:resize', width, height),
    hide: () => ipcRenderer.send('window:hide'),
    center: () => ipcRenderer.send('window:center'),
    dragStart: () => ipcRenderer.send('window:dragStart'),
    dragMove: () => ipcRenderer.send('window:dragMove'),
    dragEnd: () => ipcRenderer.send('window:dragEnd'),
    startHoppidik: () => ipcRenderer.send('window:startHoppidik'),
    stopHoppidik: () => ipcRenderer.send('window:stopHoppidik'),
    onShow: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('window-show', listener);
      return () => {
        ipcRenderer.off('window-show', listener);
      };
    }
  },
  clipboard: {
    getHistory: () => ipcRenderer.invoke('ext:invoke', 'com.nuxy.clipboard', 'getHistory'),
    clearHistory: () => ipcRenderer.invoke('ext:invoke', 'com.nuxy.clipboard', 'clearHistory'),
    deleteItem: (id: string) => ipcRenderer.invoke('ext:invoke', 'com.nuxy.clipboard', 'deleteItem', id),
    copyItem: (id: string) => ipcRenderer.invoke('ext:invoke', 'com.nuxy.clipboard', 'copyItem', id),
  }
});
