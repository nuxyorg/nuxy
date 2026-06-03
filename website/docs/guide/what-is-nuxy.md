---
title: What is Nuxy?
---

# What is Nuxy?

Nuxy is a **frameless, transparent Electron launcher** — a popup shell whose entire purpose is to get out of your way. Press a global shortcut, type something, act on the result, dismiss. Repeat.

## The Empty Shell Philosophy

The core Nuxy application deliberately does almost nothing on its own. It provides:

- A frameless, transparent Electron window with spring-physics resize animations
- A UNIX socket for toggling the window from external scripts
- A kernel that scans, loads, and mediates between extensions
- An IPC bridge that safely connects the renderer to worker-backed extensions

Everything else — the omnibar UI, the tool list, search results, clipboard management, calculator, notes, settings — comes from **extensions**. This design means the launcher is infinitely replaceable. You can swap the shell itself, and the core never needs to change.

## Extension Types

Nuxy recognizes seven extension types. Each has a distinct role:

### `tool`

A tool is a user-activated feature. When selected from the launcher, its frontend component takes over the window. Examples: Clipboard Manager, Notes, Snippets.

```json
{ "type": "tool", "capabilities": { "callable": true, "caller": false } }
```

### `provider`

A provider reacts to keystrokes in the omnibar in real time. As the user types, every active provider receives the query and returns result items. The Calculator is a provider — it evaluates math expressions as you type.

```json
{ "type": "provider", "capabilities": { "callable": false, "caller": false } }
```

### `orchestrator`

An orchestrator is the fallback handler for unmatched input. When the user presses Enter without selecting a specific result, the orchestrator receives the raw text and decides what to do with it — typically by routing to other callable extensions via the AI layer.

```json
{ "type": "orchestrator", "capabilities": { "callable": false, "caller": true } }
```

### `helper`

A helper is a background utility that other extensions call via `core.extensions.invoke`. Helpers are never shown to the user directly. They are the extension equivalent of a private service.

### `uikit`

A uikit extension ships additional React components that are loaded into `window.UI` before the shell bootstraps. Other extensions can then use these components without bundling them.

### `theme`

A theme extension ships a JSON file defining CSS custom property values. Installing a theme extension makes it available in the launcher's theme switcher. No backend, no frontend — just a `theme.json` file.

### `iconpack`

An icon pack extension ships a JSON file containing SVG strings keyed by name. The renderer accesses icons via `window.core.icons.get(name, pack?)`.

## How the Launcher Works

1. Nuxy starts and reads `~/.nuxy/nuxyconfig` for window and behavior settings.
2. The extension scanner crawls `~/.nuxy/extensions/` and reads each `manifest.json`.
3. For every extension with a `backend` entry, a Worker thread is spawned and the backend module is loaded in isolation.
4. The renderer loads the `com.nuxy.shell` bootstrap extension's frontend, which provides the omnibar UI.
5. When the user types, the shell queries providers and displays results.
6. When the user activates a tool, its frontend component is loaded via `nuxy-ext://<id>/frontend.js`.
7. When the user hides the window, everything stays loaded in memory for instant re-activation.

## Design Principles

- **No direct Node.js access from extensions** — all I/O goes through `CoreContext` APIs
- **One Worker per extension** — extensions cannot share memory or crash each other
- **Permissions declared in manifest** — the kernel rejects undeclared API calls at the host boundary
- **No custom UI components in extensions** — all UI comes from the shared `@nuxy/ui` kit via `window.UI`
- **Keyboard-first** — every action must have a keyboard binding; mouse clicks are a secondary affordance
- **No hardcoded colors** — all styling uses CSS custom property tokens from the active theme
