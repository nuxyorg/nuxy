# Particles

> Adds a subtle particle burst animation to the Nuxy window on every keypress.

**Type:** `helper`  
**Version:** 1.0.0  
**ID:** `com.nuxy.particles`  
**Permissions:** None

---

## Overview

Particles is a purely visual helper extension. It injects a full-screen canvas overlay into the Nuxy renderer and spawns small accent-coloured particles every time the user presses a key. The particles follow gravity, fade out quickly, and do not interfere with any input — the canvas is non-interactive (`pointer-events: none`). There are no settings, no backend worker, and no user-facing UI.

---

## Extension Type

### `helper`
Invisible to the user. Runs entirely in the renderer as a frontend-only extension. The canvas is mounted once when the shell boots and stays active for the lifetime of the window.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

The animation uses the CSS custom property `--color-accent` for particle colour, so it automatically adapts to the active theme.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.particles",
  "name": "Particles",
  "version": "1.0.0",
  "type": "helper",
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
