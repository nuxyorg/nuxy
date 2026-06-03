---
title: IPC & Kernel
---

# IPC & Kernel

## The IPC Contract

All communication between the renderer and extension backends goes through a single standardized IPC channel: `ext:invoke`. Every response is wrapped in a normalized `IpcResponse` object:

```typescript
interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR'
}
```

This guarantees the frontend never crashes due to an unhandled throw in a backend handler. If the handler throws, the kernel catches it and returns `{ success: false, error: 'message', code: 'INTERNAL_ERROR' }`.

## `ext:invoke` Routing

The main process registers an `ipcMain.handle('ext:invoke', ...)` handler. When the renderer calls:

```javascript
window.core.ipc.invoke('com.nuxy.clipboard', 'getHistory', { limit: 50 })
```

The main process:

1. Validates the `extId` exists in the registry
2. Validates the `channel` is in the extension's allowed channel list
3. Routes the call to the correct worker thread via `parentPort.postMessage`
4. Awaits the `host:reply` message
5. Returns the result wrapped in `IpcResponse`

## Kernel Built-ins

Some channels are handled directly in the main process without going to a worker. Use `extId: 'kernel'` (or `'core'`) to call them:

| Channel | Returns |
|---|---|
| `listTools` | All extensions with `type === 'tool'` (excludes `bootstrap` extensions) |
| `listProviders` | All extensions with `type === 'provider'` |
| `listOrchestrators` | All extensions with `type === 'orchestrator'` |
| `getConfig` | Current `NuxyConfig` (parsed `nuxyconfig`) |
| `getTheme` | Active theme definition (CSS variable map) |
| `getThemeByName` | Theme definition for a named theme |
| `getExtensionTranslations` | Translation strings for a given extension ID |

```javascript
// From extension frontend — call a kernel built-in
const res = await window.core.ipc.invoke('kernel', 'listTools', undefined)
if (res.success) {
  const tools = res.data // ToolSchema[]
}
```

## Host Call Protocol (Worker ↔ Main)

When an extension backend calls `core.clipboard.readText()`, the CoreContext proxy in `@nuxy/extension-host` does not execute anything locally. Instead:

```
Extension Worker
  core.clipboard.readText()
    │
    │  parentPort.postMessage({
    │    type: 'host:call',
    │    callId: 'uuid',
    │    method: 'clipboard:readText',
    │    args: []
    │  })
    │
    ▼
Main Process (host-handlers.ts)
  Checks: extension has 'clipboard' permission?
    │ Yes → Electron clipboard.readText()
    │ No  → Error('PERMISSION_DENIED')
    │
    │  worker.postMessage({
    │    type: 'host:reply',
    │    callId: 'uuid',
    │    result: 'clipboard text here'
    │  })
    │
    ▼
Extension Worker
  Promise resolves with 'clipboard text here'
```

Each `host:call` is matched to its `host:reply` by a unique `callId`. The proxy awaits the reply via a `Promise` before returning to the extension handler.

## Message Broker (Cross-Extension Calls)

When an extension calls `core.extensions.invoke('com.nuxy.other', 'someChannel', payload)`, the broker in the main process mediates:

1. Verify the calling extension has `capabilities.caller: true`
2. Verify the target extension has `capabilities.callable: true`
3. Forward the call to the target worker
4. Return the result to the calling worker

This means extensions are completely blind to each other — they communicate only through the kernel. A malicious extension cannot directly access another extension's memory or call its functions.

## IPC Handler Registration

In the backend, IPC handlers are registered during `register()`:

```typescript
export function register(core: CoreContext): void {
  // Register a handler the frontend can call
  core.ipc.handle('getHistory', async (payload: unknown): Promise<HistoryItem[]> => {
    const { limit } = payload as { limit: number }
    return await getStoredHistory(limit)
  })
}
```

After `register()` completes, the worker posts a `registry:sync` message to the main process listing all registered channel names. The kernel uses this to validate future `ext:invoke` calls — any channel not in this list is rejected with `UNKNOWN_CHANNEL`.

## `ipc.broadcast` (Planned)

`core.ipc.broadcast(channel, payload)` — push events from the backend to the frontend without polling. Currently a stub that logs a warning. Full implementation is planned. Use polling via `setInterval` in the frontend as a temporary workaround.

## Preload Bridge

The `window.core` object is injected by `src/electron/bootstrap/preload.ts` via Electron's `contextBridge`. The preload script runs in a sandboxed context with access to `ipcRenderer`. It exposes a minimal, typed API surface — raw `ipcRenderer.send` and `ipcRenderer.invoke` are never exposed.

```typescript
// What preload.ts exposes (simplified)
contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (extId, channel, payload) =>
      ipcRenderer.invoke('ext:invoke', { extId, channel, payload }),
  },
  window: {
    resize: (w, h) => ipcRenderer.send('window:resize', { width: w, height: h }),
    hide: () => ipcRenderer.send('window:hide'),
    esc: () => ipcRenderer.send('window:esc'),
    center: () => ipcRenderer.send('window:center'),
    onShow: (cb) => { ipcRenderer.on('window-show', cb); return () => ipcRenderer.off('window-show', cb) },
  },
  themes: { list: () => ipcRenderer.invoke('themes:list') },
  icons: {
    get: (name, pack) => ipcRenderer.invoke('icons:get', { name, pack }),
    listPacks: () => ipcRenderer.invoke('icons:listPacks'),
  },
})
```
