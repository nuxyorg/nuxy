---
title: Window API
---

# Window API

Renderer-side APIs exposed on `window.core` via the Electron preload bridge. Used by extension frontends and the shell.

## Invoke backend

```ts
const res = await window.core.ipc.invoke(extId, channel, payload)
```

See [IPC API](/api/ipc) for details.

## Window control

```ts
window.core.window.resize(width, height) // trigger spring-physics resize
window.core.window.hide() // hide the launcher
window.core.window.esc() // configured Esc action (hide/minimize/quit)
window.core.window.center() // reposition on current display
window.core.window.onShow(callback) // subscribe to show events
```

## Window drag

Frameless windows require explicit drag handling:

```ts
window.core.window.dragStart()
window.core.window.dragMove()
window.core.window.dragEnd()
```

## Themes and icons

```ts
const themes = await window.core.themes.list()
const svg = window.core.icons.get('search', 'default')
const packs = window.core.icons.listPacks()
```

## Events

Extension frontends can listen for shell events:

| Event             | Purpose                               |
| ----------------- | ------------------------------------- |
| `omniBar-keydown` | Keyboard input when omnibar is hidden |
| `omniBar-control` | Show/hide the omnibar from a tool     |

## Related

- [Configuration](/guide/configuration) — `escAction`, `blurAction`, window size/position
- [Extension Access & Permissions](/extensions/extension-access)
