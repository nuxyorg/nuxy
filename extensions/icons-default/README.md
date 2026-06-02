# Default Icons

> The built-in icon pack that ships with Nuxy, providing a complete set of named SVG icons used throughout the UI.

**Type:** `iconpack`  
**Version:** 1.0.0  
**ID:** `com.nuxy.icons-default`  
**Permissions:** None

---

## Overview

Default Icons is the baseline icon pack for Nuxy. It supplies a set of Lucide-style stroke SVG icons loaded at startup and accessible by name through `window.core.icons.get(name)`. All bundled extensions and core UI components reference icons from this pack. Because it is loaded first, it acts as the fallback when a requested icon name is not found in any other pack.

---

## Extension Type

### `iconpack`
Supplies a set of named SVG icons. Loaded at startup; icons are accessed by name via `window.core.icons.get(name, pack?)`.

---

## Available Icons

The pack ships 50 icons covering common UI actions and extension categories:

| Name | Description |
|------|-------------|
| `shell` | Terminal / command prompt |
| `clipboard` | Clipboard with document |
| `calculator` | Calculator keypad |
| `gradient` | Half-filled circle (gradient visual) |
| `search` | Magnifying glass |
| `settings` | Gear / cog |
| `file` | Generic file |
| `folder` | Folder |
| `link` | Chain link |
| `star` | Star / favourite |
| `music` | Music notes |
| `tool` | Wrench |
| `calendar` | Calendar grid |
| `notes` | Lined document |
| `emoji` | Smiley face |
| `bitwarden` | Lock / password vault |
| `video` | Video camera |
| `workflow` | Node graph |
| `ai` | Pin / AI indicator |
| `clock` | Analog clock face |
| `copy` | Copy-to-clipboard |
| `check` | Checkmark |
| `trash` | Trash bin |
| `edit` | Pencil / edit |
| `pin` | Pin |
| `download` | Download arrow |
| `upload` | Upload arrow |
| `refresh` | Circular refresh arrows |
| `globe` | Globe / world |
| `close` | X close button |
| `plus` | Plus / add |
| `minus` | Minus / remove |
| `arrow-left` | Arrow left |
| `arrow-right` | Arrow right |
| `chevron-down` | Chevron down |
| `chevron-up` | Chevron up |
| `mic` | Microphone |
| `image` | Image / photo |
| `lock` | Locked padlock |
| `unlock` | Unlocked padlock |
| `eye` | Visible / show |
| `eye-off` | Hidden / hide |
| `warning` | Warning triangle |
| `info` | Info circle |
| `send` | Send / paper plane |
| `filter` | Filter funnel |
| `tag` | Tag / label |
| `user` | Person / user |
| `zap` | Lightning bolt |

### Accessing icons in extensions

```ts
// Get an SVG string by name
const svg = window.core.icons.get('notes')

// Get from this pack explicitly
const svg = window.core.icons.get('notes', 'default')

// List all loaded pack names
const packs = window.core.icons.listPacks()
```

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

All platforms supported by Nuxy.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.icons-default",
  "name": "Default Icons",
  "version": "1.0.0",
  "type": "iconpack",
  "permissions": [],
  "entry": {
    "icons": "icons.json"
  }
}
```
