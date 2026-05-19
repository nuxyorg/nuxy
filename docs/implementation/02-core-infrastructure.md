# Implementation Phase 2: Core Infrastructure

## Goal
Establish the architectural backbone: The Window Manager, the Secure Preload Bridge, and the Dependency Injection (CoreContext) kernel.

## Step 1: The Core Context Object
Define the API that the Host will inject into the modules.
Create `shared/types/core.ts`:
```typescript
export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CoreContext {
  ipc: {
    handle: <T, R>(channel: string, listener: (data: T) => Promise<IpcResponse<R>>) => void;
    broadcast: <T>(channel: string, data: T) => void;
  };
  storage: {
    read: <T>(file: string) => Promise<T>;
    write: <T>(file: string, data: T) => Promise<void>;
  };
  window: {
    hide: () => void;
    show: () => void;
  };
}
```

## Step 2: The Preload Bridge
Create `electron/preload/preload.ts` to strictly expose `ipcRenderer` functionality safely to React.

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (channel: string, payload?: any) => ipcRenderer.invoke(channel, payload),
    on: (channel: string, listener: (payload: any) => void) => {
      const handler = (_: any, data: any) => listener(data);
      ipcRenderer.on(channel, handler);
      // Return cleanup function for React useEffect
      return () => ipcRenderer.removeListener(channel, handler); 
    }
  }
});
```

## Step 3: Implement The Window Manager
Create `electron/main/WindowManager.ts` to handle the invisible daemon lifecycle.

```typescript
import { BrowserWindow, screen } from 'electron';
import path from 'path';

export class WindowManager {
  private win: BrowserWindow | null = null;

  createWindow() {
    this.win = new BrowserWindow({
      width: 800, height: 600,
      frame: false, transparent: true, show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, '../preload/preload.mjs')
      }
    });

    // Handle blur: Do not destroy, just hide and throttle
    this.win.on('blur', () => {
      this.hide();
    });
  }

  show() {
    this.win?.webContents.setBackgroundThrottling(false);
    this.win?.show();
    this.win?.focus();
  }

  hide() {
    this.win?.hide();
    this.win?.webContents.setBackgroundThrottling(true);
  }
}
```

## Step 4: The Extension Scanner & Worker Loader
Create `electron/main/index.ts` to bootstrap the app and dynamically inject `CoreContext` into isolated Worker Threads.

```typescript
import { app } from 'electron';
import { WindowManager } from './WindowManager';
import { StorageEngine } from '../core/Storage';
import { ExtensionScanner } from './ExtensionScanner';
// ... logic to read ~/.nuxy/extensions and spawn Worker threads

app.whenReady().then(() => {
  const windowManager = new WindowManager();
  windowManager.createWindow();
  
  // Construct context API
  const coreContext = {
     window: { hide: () => windowManager.hide(), show: () => windowManager.show() },
     storage: new StorageEngine(), // Translates paths to ~/.nuxy/data/<ext_id>
     registry: { /* schema validators */ },
     extensions: { /* IPC routing */ }
  };

  // Scan user's directory and spawn isolated workers
  const scanner = new ExtensionScanner();
  scanner.loadExtensions(coreContext);
});
```

---

**Next Phase:** [03. Feature Implementation](./03-feature-implementation.md) | **Previous Phase:** [01. Setup](./01-setup.md)
