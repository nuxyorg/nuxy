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
window.core.window.ready() // signal the window is ready
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

## Tools

```ts
const tag = await window.core.tools.resolveElementTag('com.nuxy.my-tool')
```

Resolves the custom element tag name for a tool extension.

## Composition

```ts
window.core.composition.mount(slotName, extId, opts)
window.core.composition.unmount(handleId)
```

UI composition bridge to dynamically mount extension UI into the shell.

## Shell

```ts
window.core.shell.getSnapshot()
window.core.shell.updateSnapshot(state)
```

Shell state bridge.

## Events

```ts
window.core.events.on(event, callback)
window.core.events.off(event, callback)
window.core.events.emit(event, data)
```

Event broadcasting bridge for extensions.

## Events

Extension frontends can listen for shell events:

| Event             | Purpose                               |
| ----------------- | ------------------------------------- |
| `omniBar-keydown` | Keyboard input when omnibar is hidden |
| `omniBar-control` | Show/hide the omnibar from a tool     |

## Related

- [Configuration](/guide/configuration) — `escAction`, `blurAction`, window size/position
- [Extension Access & Permissions](/extensions/extension-access)
