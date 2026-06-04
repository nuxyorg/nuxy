# Gradient

> Renders an animated WebGL mesh gradient as a fullscreen background effect inside the Nuxy shell.

**Type:** `helper`  
**Version:** 1.0.0  
**ID:** `com.nuxy.gradient`  
**Permissions:** None

---

## Overview

Gradient is a visual helper extension that injects a WebGL-powered animated gradient into the Nuxy shell window. It is based on Stripe's mesh gradient shader and blends four configurable CSS custom-property colors (`--gradient-1` through `--gradient-4`) into a smoothly animated wave surface. The gradient attaches itself to the shell container on startup and responds to `nuxy-gradient-toggle` events dispatched by other extensions, allowing them to activate or deactivate the effect on demand.

---

## Extension Type

### `helper`

Invisible to the user. Runs in the background or responds to events dispatched by other extensions. Never appears in the tool list.

---

## How It Works

On startup the frontend module attaches a hidden `<canvas>` element to the `.nuxy-shell-container`. The canvas is initially paused. Any extension can show or hide the gradient by dispatching a `nuxy-gradient-toggle` CustomEvent:

```js
// Activate the standard animated gradient
window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: true }))

// Deactivate and pause
window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))

// Activate with a specific visual mode
window.dispatchEvent(
  new CustomEvent('nuxy-gradient-toggle', {
    detail: { active: true, mode: 'rainbow' }, // modes: 'light' | 'rainbow' | 'bit'
  })
)
```

When activated, the shell container receives the CSS class `nuxy-shell-container--gradient-active` (or `--gradient-rainbow` / `--gradient-bit` for alternate modes). When deactivated the class is removed and the WebGL animation pauses after a 500 ms fade delay.

### Color customization

The gradient colors are sourced from CSS custom properties set on the canvas element. Override them in a theme extension to change the color palette:

```css
--gradient-1: #c3e4f5;
--gradient-2: #6ec3f4;
--gradient-3: #eae2ff;
--gradient-4: #b2c7f8;
```

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

Requires a GPU that supports WebGL. The extension silently does nothing if WebGL is unavailable.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.gradient",
  "name": "Gradient",
  "version": "1.0.0",
  "type": "helper",
  "icon": "gradient",
  "permissions": [],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "frontend": "frontend.tsx"
  }
}
```
