# Ambient Sound

> Plays a subtle keystroke sound on every key press inside the Nuxy window.

**Type:** `helper`
**Version:** 1.0.0
**ID:** `com.nuxy.ambient-sound`
**Permissions:** None

---

## Overview

Ambient Sound adds tactile audio feedback to the Nuxy launcher. Every time a key is pressed inside the Nuxy window, it synthesises a short sound using the Web Audio API — no external audio files are required. Three sound styles are available: a crisp `click` (white-noise burst), a sharper `typewriter` tap, and a gentle `soft` sine-wave tone. Volume and style can be adjusted from the Settings tool or disabled entirely.

---

## Extension Type

### `helper`

Invisible to the user. Runs in the background and responds to events dispatched by other extensions. Never appears in the tool list.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key       | Type   | Default | Description                                         |
| --------- | ------ | ------- | --------------------------------------------------- |
| `enabled` | toggle | `true`  | Enable or disable keystroke sounds                  |
| `volume`  | text   | `0.2`   | Playback volume from `0.0` (silent) to `1.0` (full) |
| `style`   | select | `click` | Sound style: `click`, `soft`, or `typewriter`       |

Settings reload automatically whenever they are changed — no restart required.

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

Audio synthesis is performed entirely in the renderer process via the Web Audio API. No system audio libraries or external dependencies are needed.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.ambient-sound",
  "name": "Ambient Sound",
  "version": "1.0.0",
  "type": "helper",
  "permissions": [],
  "capabilities": { "callable": false, "caller": false },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```
