---
title: IPC & Kernel
---

# IPC & Kernel

All renderer ↔ backend communication goes through a single channel: `ext:invoke`. Every response is wrapped in `IpcResponse`:

```typescript
interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR'
}
```

Unhandled backend throws become `{ success: false, code: 'INTERNAL_ERROR' }` — the renderer never crashes on a bad handler.

## Calling an extension

```javascript
const res = await window.core.ipc.invoke('com.nuxy.notes', 'listNotes', { limit: 50 })
if (res.success) {
  const notes = res.data
}
```

The main process:

1. Validates `extId` exists in the registry
2. Validates the channel is registered by that extension
3. Routes to the correct Worker via `parentPort`
4. Awaits `host:reply` and returns `IpcResponse`

## Kernel built-ins

Use `extId: 'kernel'` (or `'core'`) for main-process handlers:

| Channel                    | Returns                               |
| -------------------------- | ------------------------------------- |
| `listTools`                | All `type: "tool"` extensions         |
| `listProviders`            | All `type: "provider"` extensions     |
| `listOrchestrators`        | All `type: "orchestrator"` extensions |
| `getConfig`                | Parsed `nuxyconfig`                   |
| `getTheme`                 | Active theme CSS variables            |
| `getThemeByName`           | Named theme definition                |
| `getExtensionTranslations` | Locale strings for an extension       |

```javascript
const res = await window.core.ipc.invoke('kernel', 'listTools')
```

## Host call protocol (Worker ↔ main)

When a backend calls `core.storage.read('notes.json')`, the `CoreContext` proxy serializes a `host:call` message:

```
Extension Worker                    Main Process
  core.storage.read('notes.json')
    │ host:call { method: 'storage:read', args: [...] }
    ├──────────────────────────────────►  permission check
    │                                       read file
    │◄──────────────────────────────────  host:reply { result }
  Promise resolves
```

Each call is matched by a unique `callId`. No Worker has direct Electron or Node I/O access.

## Cross-extension calls

`core.extensions.invoke(targetId, channel, payload)` routes through the message broker:

1. Caller must have `capabilities.caller: true`
2. Target must have `capabilities.callable: true`
3. Broker forwards to the target Worker and returns the result

Extensions cannot call each other directly — only through the kernel.

## Registering handlers

```typescript
export function register(core: CoreContext): void {
  core.ipc.handle('listNotes', async (payload: unknown) => {
    const { limit } = payload as { limit: number }
    return await core.storage.read(`notes-${limit}.json`)
  })
}
```

After `register()`, the Worker sends `registry:sync` listing all channel names. Unknown channels are rejected with `UNKNOWN_CHANNEL`.

### Public channels and sample payloads

Cross-extension channels require `manifest.ipc.public` and `{ expose: 'public' }` on the handler. Add matching `manifest.ipc.samples` entries — one example JSON payload per public channel. IPC Explorer reads these to pre-fill invoke payloads; the kernel warns at startup when a public channel has no sample.

```json
{
  "ipc": {
    "public": ["getStatus"],
    "samples": { "getStatus": {} }
  }
}
```

See [IPC API → Public vs private channels](/api/ipc) and [Manifest Reference → Public IPC surface](/extensions/manifest#public-ipc-surface-ipc).

## Preload bridge

`window.core` is injected by `preload.ts` via `contextBridge`. Raw `ipcRenderer` is never exposed:

```typescript
contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (extId, channel, payload) =>
      ipcRenderer.invoke('ext:invoke', { extId, channel, payload }),
  },
  window: { resize, hide, esc, center, onShow, dragStart, dragMove, dragEnd },
  themes: { list: () => ipcRenderer.invoke('themes:list') },
  icons: {
    get: (name, pack) => ipcRenderer.invoke('icons:get', { name, pack }),
    listPacks: () => ipcRenderer.invoke('icons:listPacks'),
  },
})
```

## Next steps

- [API: IPC](/api/ipc) — typed invoker patterns
- [Extension Access](/extensions/extension-access) — permissions and capabilities
- [Security](/guide/security) — isolation model
