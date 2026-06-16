---
title: Extension Simulator
---

# Extension Simulator

::: warning Beta
The simulator is available in the current beta. The API surface is stable; visual polish and additional mock controls are planned before the stable release.
:::

The **extension simulator** (`packages/ext-devserver`) lets you build and iterate on a Nuxy extension frontend entirely in the browser — no Electron, no running Nuxy instance. All IPC calls are intercepted and routed through a configurable mock layer.

## How It Works

```
Browser (Vite dev server)
  └─ DevShell             — renders the simulated Nuxy window + omnibar
      └─ nuxy-tool-<name>  — your extension frontend, mounted live
  └─ MockPanel            — IPC log + runtime mock editor

Vite server (Node.js)
  └─ /api/invoke          — runs your real backend.ts handlers
  └─ virtual:ext-mocks    — loads dev/mocks.ts when present
```

IPC resolution order (highest priority first):

1. **Runtime mocks** — values you set in the MockPanel UI during the session
2. **Real backend** — your `backend.ts` runs in the Vite server; handler output is returned
3. **File mocks** — static returns declared in `dev/mocks.ts`
4. **Null fallback** — `{ success: true, data: null }`

## Starting the Simulator

```bash
pnpm dev-ext <extension-name>
```

The dev server starts on `http://localhost:5174` and opens the browser automatically.

```bash
# Examples
pnpm dev-ext clipboard
pnpm dev-ext notes
pnpm dev-ext nyaa
```

The extension name must match a folder under `extensions/` in the monorepo. Extensions installed in `~/.nxy/extensions/` are not visible to the dev server.

## What Gets Mocked

### `window.core`

The simulator injects a full `window.core` object before your frontend code runs:

| Property                                   | Mock behavior                                    |
| ------------------------------------------ | ------------------------------------------------ |
| `core.ipc.invoke(extId, channel, payload)` | Routes through the 4-layer mock resolution above |
| `core.window.hide()`                       | No-op                                            |
| `core.window.resize(h)`                    | No-op                                            |
| `core.window.center()`                     | No-op                                            |
| `core.window.drag()`                       | No-op                                            |
| `core.window.onShow(cb)`                   | Returns a no-op unsubscribe function             |
| `core.window.esc()`                        | No-op                                            |
| `core.icons.get(name, pack?)`              | Returns `''` (empty string)                      |
| `core.icons.listPacks()`                   | Returns `[]`                                     |
| `core.themes.list()`                       | Returns `[]`                                     |

### `window.UI`

The UI kit (`extensions/ui-default`) is loaded directly — you get real `nuxy-button`, `nuxy-card`, and all other components rendered as they appear in the real launcher.

### Kernel IPC channels

| Channel                             | Mock return            |
| ----------------------------------- | ---------------------- |
| `kernel / getExtensionTranslations` | `{ translations: {} }` |
| `kernel / getThemeByName`           | `null`                 |
| Any other kernel channel            | `null`                 |

## File-Based Mocks (`dev/mocks.ts`)

Create a `dev/mocks.ts` file inside your extension folder to provide static defaults without touching the MockPanel:

```ts
// extensions/my-extension/dev/mocks.ts
export default {
  // Static value
  getItems: [
    { id: '1', title: 'First item', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: '2', title: 'Second item', createdAt: '2026-01-02T00:00:00.000Z' },
  ],

  // Dynamic function — receives the real payload
  search: async (payload: unknown) => {
    const { query } = payload as { query: string }
    return [{ id: '3', title: `Result for "${query}"` }]
  },
}
```

File mocks are only used when:

- The channel has no runtime mock set in the MockPanel
- The real backend either has no handler for this channel or the dev server is unavailable

## MockPanel

The MockPanel appears below the simulated window. It auto-discovers channels as your extension makes IPC calls and shows one row per channel.

Each row displays:

- Channel name (highlighted when an active mock is applied)
- Last call timestamp and **source badge** (`backend` / `file` / `ui` / `null`)
- A textarea pre-filled with the last returned value

**Setting a runtime mock:**

Edit the textarea for any channel and click **Apply** (or press `Ctrl+Enter`). All subsequent calls to that channel will return your JSON value for the rest of the session.

**Removing a mock:**

Click **remove** on any row. The channel disappears from the panel until your extension calls it again.

**Adding a channel manually:**

Use the **+ add** input at the bottom of the panel to pre-register a channel before your extension has called it — useful for injecting mocks before the first render.

## Query Simulation

The omnibar at the top of the simulated window drives `toolEl.query`. Type to update the query live — the extension receives each keystroke as it would in the real launcher.

Pressing **Enter** sets `toolEl.committedQuery`, matching the confirmed-search behavior of the real shell.

## Adding Your Backend

If `backend.ts` exists in your extension folder, the dev server loads it automatically and runs your real handlers. You do not need to mock channels your backend already handles.

The server-side `CoreContext` used by the backend is a minimal mock:

- `core.storage` — in-memory Map; data persists within a session, resets on server restart
- `core.clipboard` — returns empty values
- `core.fs` — no-op / empty returns
- `core.logger` — console passthrough
- `core.i18n` — `{ locale: 'en', dir: 'ltr', t: key => key }`

To persist data during development, use file mocks or override the storage mock in `vite.config.ts`.

## Limitations

- Theme CSS custom properties are not injected — the simulated window uses hardcoded dark defaults
- `core.events` (the cross-extension event bus) is not available
- `core.media`, `core.db`, `core.shell` are no-ops even in the backend mock
- Extension-to-extension IPC (`core.extensions.invoke`) always returns `{ success: true, data: null }`
- The simulated window size is fixed (680 × 500 px) — spring-physics resize is not active
