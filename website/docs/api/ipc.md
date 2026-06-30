---
title: IPC API
---

# IPC API

Nuxy routes all communication between the renderer, main process, and extension workers through a typed IPC layer.

## Backend: register handlers

```ts
export function register(core: CoreContext): void {
  core.ipc.handle('greet', async (payload: unknown) => {
    const { name } = payload as { name: string }
    return { message: `Hello, ${name}!` }
  })
}
```

Handlers are namespaced by extension ID. Channel names are arbitrary strings defined by the extension.

### Public vs private channels

By default, handlers are **private** — invokable only from the same extension's renderer when `callerExtId` equals the target extension id.

To expose a channel to other extensions:

1. Add it to `manifest.json`:

```json
"ipc": {
  "public": ["getStatus", "add"],
  "samples": {
    "getStatus": {},
    "add": { "url": "magnet:?xt=..." }
  }
}
```

2. Register with `{ expose: 'public' }`:

```ts
core.ipc.handle('getStatus', handler, { expose: 'public' })
```

3. Add a matching `ipc.samples` entry for every channel in `ipc.public` (strongly recommended). These example JSON payloads document the cross-extension contract, pre-fill the IPC Explorer invoke textarea, and are validated at startup — the kernel logs a warning when a public channel has no sample.

The kernel validates manifest declarations against registered handlers at startup. Cross-extension renderer calls also require `capabilities.callable: true` on the target extension.

## Frontend: invoke handlers

```ts
const res = await window.core.ipc.invoke(
  'com.nuxy.my-extension',
  'greet',
  { name: 'World' },
  {
    callerExtId: 'com.nuxy.my-extension',
  }
)
if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
const data = res.data
```

Use `invokeExtensionIpc` from `@nuxyorg/extension-sdk` so caller identity is always set:

```ts
import { invokeExtensionIpc } from '@nuxyorg/extension-sdk'

async function invoke<C extends keyof IpcChannels>(
  channel: C,
  payload?: IpcChannels[C]['input']
): Promise<IpcChannels[C]['output']> {
  return invokeExtensionIpc(EXT_ID, channel, payload)
}
```

For cross-extension calls, pass the caller extension id as the fourth argument:

```ts
await invokeExtensionIpc('com.nuxy.qbittorrent', 'getStatus', {}, 'com.nuxy.nyaa')
```

Private channels without `callerExtId` are rejected with `CALLER_REQUIRED`.

## Kernel channels

Invoke with `extId` set to `kernel` or `core`:

| Channel             | Returns                               |
| ------------------- | ------------------------------------- |
| `listTools`         | All `type: "tool"` extensions         |
| `listProviders`     | All `type: "provider"` extensions     |
| `listOrchestrators` | All `type: "orchestrator"` extensions |
| `getConfig`         | Application config from `nuxyconfig`  |
| `getTheme`          | Active theme definition               |

## Cross-extension calls

```ts
// From one extension backend to another (public channels only)
await core.extensions.invoke('com.nuxy.other', 'someChannel', payload)
```

Enforced by `capabilities.callable` / `capabilities.caller` in manifests and the public channel registry.

## Provider convention

Provider extensions must handle the `eval` channel. The shell sends the current omnibar query and expects a list of result items.

## Related

- [IPC & Kernel](/guide/ipc-kernel)
- [Extension Access & Permissions](/extensions/extension-access)
