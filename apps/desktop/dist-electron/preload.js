"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("core", {
  ipc: {
    invoke: (extId, channel, payload) => electron.ipcRenderer.invoke("ext:invoke", extId, channel, payload)
  }
});
