# Cursor Trail

> Draws a fading particle trail that follows the mouse cursor across the Nuxy window.

**Type:** `helper`
**Version:** 1.0.0
**ID:** `com.nuxy.cursor-trail`
**Permissions:** None

---

## Overview

Cursor Trail is a purely visual helper that runs in the renderer. It injects a full-screen canvas overlay into the page and paints a chain of fading, shrinking circles that follow the mouse pointer. The trail color automatically picks up the active theme's `--color-accent` CSS variable, so it always matches the current theme. There is no backend, no settings, and no user interaction required — the effect is active as long as the extension is installed.

---

## Extension Type

### `helper`
Invisible to the user. Runs in the background as a passive visual layer on top of the shell UI. Never appears in the tool list.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

The canvas overlay uses standard browser APIs (`requestAnimationFrame`, `mousemove`) and has no platform-specific dependencies.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.cursor-trail",
  "name": "Cursor Trail",
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
