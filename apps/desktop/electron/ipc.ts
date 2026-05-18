/// <reference types="vite/client" />
import { ipcMain, BrowserWindow, screen } from 'electron';
import { activeWorkers } from './worker/spawn.js';
import { loadedExtensions } from './scanner.js';
import { getOrCreateSpring } from './spring.js';
import { kernelLogger } from '../../../packages/core/src/logger.js';
import { getConfig, THEMES_DIR, DEFAULT_DARK_THEME } from './nuxyconfig.js';
import fs from 'fs';
import path from 'path';

const log = kernelLogger.child('IPC');

let dragOffset: { x: number; y: number } | null = null;

export function registerIpc() {
  log.info('Registering IPC handlers...');

  // ── ext:invoke ──────────────────────────────────────────────────────────────
  ipcMain.handle('ext:invoke', async (event, extId: string, channel: string, payload: unknown) => {
    log.silly(`ext:invoke received`, { extId, channel, payload });

    if (extId === 'kernel' || extId === 'core') {
      if (channel === 'listTools') {
        const tools = loadedExtensions.filter((ext: any) => ext.manifest && ext.manifest.type === 'tool');
        return { success: true, data: tools };
      }

      if (channel === 'listProviders') {
        const providers = loadedExtensions.filter((ext: any) => ext.manifest && ext.manifest.type === 'provider');
        return { success: true, data: providers };
      }

      if (channel === 'getTheme') {
        const cfg = getConfig();
        let themeName = cfg.theme || 'dark';
        if (themeName === 'system') {
          const { nativeTheme } = await import('electron');
          themeName = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        }
        const themePath = path.join(THEMES_DIR, `${themeName}.json`);
        try {
          if (fs.existsSync(themePath)) {
            const content = fs.readFileSync(themePath, 'utf8');
            return { success: true, data: JSON.parse(content) };
          }
        } catch (e) {
          log.error(`Failed to read theme ${themeName} from ${themePath}:`, e);
        }
        return { success: true, data: DEFAULT_DARK_THEME };
      }
    }

    const worker = activeWorkers.get(extId);
    if (!worker) {
      log.warn(`ext:invoke — no active worker for extId: "${extId}"`);
      return { success: false, error: 'Worker not found' };
    }

    return new Promise((resolve) => {
      const msgId = Math.random().toString(36).slice(2);
      log.silly(`Dispatching message to worker "${extId}"`, { msgId, channel, payload });

      const listener = (msg: any) => {
        if (msg.id === msgId) {
          worker.off('message', listener);
          if (msg.error) {
            log.warn(`Worker "${extId}" replied with error on channel "${channel}"`, msg.error);
            resolve({ success: false, error: msg.error });
          } else {
            log.silly(`Worker "${extId}" replied on channel "${channel}"`, msg.result);
            resolve({ success: true, data: msg.result });
          }
        }
      };

      worker.on('message', listener);
      worker.postMessage({ id: msgId, channel, payload });
    });
  });

  // ── window:resize ────────────────────────────────────────────────────────────
  // Renderer sends content dimensions; we compute frame size + centered position
  // and feed them to the spring controller which handles mid-animation redirects.
  ipcMain.on('window:resize', (event, width: number, height: number) => {
    log.silly(`window:resize → ${width}x${height}`);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) { log.warn('window:resize — no BrowserWindow for sender'); return; }

    if (import.meta.env.DEV && (global as any).isHoppidikActive?.()) {
      log.silly('window:resize ignored because hoppidik is active');
      return;
    }

    try {
      const bounds  = win.getBounds();
      const [cw, ch] = win.getContentSize();
      const frameW  = bounds.width  - cw;
      const frameH  = bounds.height - ch;

      // Renderer sends CSS (logical) pixels; getBounds/getContentSize return
      // physical pixels on Linux. Multiply by scaleFactor to convert.
      const scale   = screen.getDisplayMatching(bounds).scaleFactor;
      const targetW = Math.round(width  * scale) + frameW;
      const targetH = Math.round(height * scale) + frameH;

      log.silly(`window:resize target → ${targetW}x${targetH} (scale=${scale})`);
      const spring = getOrCreateSpring(win);
      spring.setTarget({
        width: targetW,
        height: targetH,
      });
      if (!win.isVisible() || bounds.height < 100) {
        spring.snapToTarget();
        log.info(`Window snapped instantly to target size (${targetW}x${targetH})`);
      }
    } catch (error) {
      log.error('window:resize failed, falling back to instant resize', error);
      win.setContentSize(width, height);
    }
  });

  // ── window:center ────────────────────────────────────────────────────────────
  ipcMain.on('window:center', (_event) => {
    log.silly('window:center received — centering disabled');
  });

  // ── window:dragStart ─────────────────────────────────────────────────────────
  ipcMain.on('window:dragStart', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const [wx, wy] = win.getPosition();
    dragOffset = { x: wx - cursor.x, y: wy - cursor.y };
    getOrCreateSpring(win).pause();
    log.silly(`window:dragStart offset=(${dragOffset.x}, ${dragOffset.y})`);
  });

  // ── window:dragMove ──────────────────────────────────────────────────────────
  ipcMain.on('window:dragMove', (event) => {
    if (!dragOffset) return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    win.setPosition(
      Math.round(cursor.x + dragOffset.x),
      Math.round(cursor.y + dragOffset.y)
    );
  });

  // ── window:dragEnd ───────────────────────────────────────────────────────────
  ipcMain.on('window:dragEnd', (event) => {
    if (!dragOffset) return;
    dragOffset = null;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    getOrCreateSpring(win).syncState();
    log.silly(`window:dragEnd — spring synced to ${JSON.stringify(win.getBounds())}`);
  });

  // ── window:hide ──────────────────────────────────────────────────────────────
  ipcMain.on('window:hide', (event) => {
    log.info('window:hide received — hiding main window.');
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (import.meta.env.DEV) {
        (global as any).clearHoppidik?.();
      }
      win.hide();
    } else {
      log.warn('window:hide — no BrowserWindow for sender');
    }
  });

  if (import.meta.env.DEV) {
    import('./dev/hoppidik.js').then(({ registerHoppidikHandlers }) => {
      registerHoppidikHandlers();
    }).catch(err => {
      log.error('Failed to register hoppidik handlers:', err);
    });
  }

  log.info(`IPC handlers registered: [ext:invoke, window:resize, window:center, window:hide${import.meta.env.DEV ? ', window:startHoppidik, window:stopHoppidik' : ''}]`);
}
