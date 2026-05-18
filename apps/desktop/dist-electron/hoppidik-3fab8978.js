import { ipcMain, BrowserWindow, screen } from "electron";
import { g as getOrCreateSpring, k as kernelLogger } from "./main-94b9e4dc.js";
import "path";
import "fs";
import "os";
import "worker_threads";
const log = kernelLogger.child("Hoppidik");
let hoppidikInterval = null;
global.isHoppidikActive = () => {
  return hoppidikInterval !== null;
};
global.clearHoppidik = () => {
  if (hoppidikInterval) {
    clearInterval(hoppidikInterval);
    hoppidikInterval = null;
    log.info("Cleared hoppidikInterval");
  }
};
function registerHoppidikHandlers() {
  ipcMain.on("window:startHoppidik", (event) => {
    log.info("window:startHoppidik received");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log.warn("window:startHoppidik — no BrowserWindow for sender");
      return;
    }
    if (hoppidikInterval)
      return;
    const spring = getOrCreateSpring(win);
    const hop = () => {
      try {
        if (win.isDestroyed()) {
          if (hoppidikInterval) {
            clearInterval(hoppidikInterval);
            hoppidikInterval = null;
          }
          return;
        }
        const bounds = win.getBounds();
        const display = screen.getDisplayMatching(bounds);
        const displayBounds = display.bounds;
        const randomHeight = Math.floor(Math.random() * (700 - 150 + 1)) + 150;
        const w = bounds.width;
        const maxX = displayBounds.x + displayBounds.width - w;
        const minX = displayBounds.x;
        const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        const maxY = displayBounds.y + displayBounds.height - randomHeight;
        const minY = displayBounds.y;
        const randomY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        log.info(`Hoppidik bounce to (${randomX}, ${randomY}) with height ${randomHeight}`);
        spring.setTarget({
          x: randomX,
          y: randomY,
          height: randomHeight
        });
      } catch (e) {
        log.error("Hoppidik bounce calculation failed", e);
      }
    };
    hop();
    hoppidikInterval = setInterval(hop, 800);
  });
  ipcMain.on("window:stopHoppidik", (event) => {
    log.info("window:stopHoppidik received");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log.warn("window:stopHoppidik — no BrowserWindow for sender");
      return;
    }
    if (hoppidikInterval) {
      clearInterval(hoppidikInterval);
      hoppidikInterval = null;
      log.info("Stopped hoppidik interval");
    }
    log.info("Hoppidik stopped");
  });
}
export {
  registerHoppidikHandlers
};
