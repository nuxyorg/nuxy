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

## Frontend: invoke handlers

```ts
const res = await window.core.ipc.invoke('com.nuxy.my-extension', 'greet', { name: 'World' })
if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
const data = res.data
```

Use a typed invoker wrapper in your extension for cleaner call sites:

```ts
async function invoke<C extends keyof IpcChannels>(
  channel: C,
  payload?: IpcChannels[C]['input']
): Promise<IpcChannels[C]['output']> {
  const res = await window.core.ipc.invoke(EXT_ID, channel, payload)
  if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
  return res.data
}
```

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
// From one extension backend to another
await core.extensions.invoke('com.nuxy.other', 'someChannel', payload)
```

Enforced by `capabilities.callable` / `capabilities.caller` in manifests.

## Provider convention

Provider extensions must handle the `eval` channel. The shell sends the current omnibar query and expects a list of result items.

## Related

- [IPC & Kernel](/guide/ipc-kernel)
- [Extension Access & Permissions](/extensions/extension-access)
