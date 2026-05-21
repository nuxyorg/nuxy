# Nuxy extensions (workspace)

Sample extensions synced to `~/.nuxy/extensions/` when you run `pnpm dev`.

## Authoring

1. Add a folder with `manifest.json` and `backend.js` (plus optional `frontend.js`).
2. Depend on `@nuxy/extension-sdk` for types and `defineExtension`:

```js
/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

export function register(core) {
  core.registry.registerTool({ name: 'my-tool' })
}
```

Or with TypeScript (`backend.ts`):

```ts
import { defineExtension } from '@nuxy/extension-sdk'

export default defineExtension({
  register(core) {
    core.clipboard.readText()
  },
})
```

> **Permissions required:** `core.clipboard` calls only work when `"clipboard"` is listed in your manifest's `permissions` array. Without it the kernel returns a `PERMISSION_DENIED` error at runtime.
>
> ```json
> { "permissions": ["clipboard"] }
> ```

3. Set `manifest.id` (e.g. `com.nuxy.my-ext`) — used for IPC, storage, and `nuxy-ext://` URLs.
4. Run `pnpm dev` from the repo; dev sync copies this folder into `~/.nuxy/extensions/`.

Override sync source: `NUXY_EXTENSIONS_SRC=/path/to/extensions`  
Full replace: `NUXY_DEV_OVERWRITE=1`

See [docs/21-extension-access.md](../docs/21-extension-access.md) for the full API surface.
