"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("core", {
  ipc: {
    invoke: (extId, channel, payload) => electron.ipcRenderer.invoke("ext:invoke", extId, channel, payload)
  },
  window: {
    resize: (width, height) => electron.ipcRenderer.send("window:resize", width, height),
    hide: () => electron.ipcRenderer.send("window:hide"),
    center: () => electron.ipcRenderer.send("window:center"),
    dragStart: () => electron.ipcRenderer.send("window:dragStart"),
    dragMove: () => electron.ipcRenderer.send("window:dragMove"),
    dragEnd: () => electron.ipcRenderer.send("window:dragEnd"),
    startHoppidik: () => electron.ipcRenderer.send("window:startHoppidik"),
    stopHoppidik: () => electron.ipcRenderer.send("window:stopHoppidik"),
    onShow: (callback) => {
      const listener = () => callback();
      electron.ipcRenderer.on("window-show", listener);
      return () => {
        electron.ipcRenderer.off("window-show", listener);
      };
    }
  },
  clipboard: {
    getHistory: () => electron.ipcRenderer.invoke("ext:invoke", "com.nuxy.clipboard", "getHistory"),
    clearHistory: () => electron.ipcRenderer.invoke("ext:invoke", "com.nuxy.clipboard", "clearHistory"),
    deleteItem: (id) => electron.ipcRenderer.invoke("ext:invoke", "com.nuxy.clipboard", "deleteItem", id),
    copyItem: (id) => electron.ipcRenderer.invoke("ext:invoke", "com.nuxy.clipboard", "copyItem", id)
  }
});
