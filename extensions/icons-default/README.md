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

The pack ships 65 icons covering common UI actions and extension categories:

| Name            | Description                          |
| --------------- | ------------------------------------ |
| `alert-circle`  | Exclamation mark in a circle         |
| `archive`       | Archive box / drawer                 |
| `arrow-down`    | Arrow pointing down                  |
| `arrow-left`    | Arrow pointing left                  |
| `arrow-right`   | Arrow pointing right                 |
| `arrow-up`      | Arrow pointing up                    |
| `bell`          | Notification bell                    |
| `calculator`    | Calculator keypad                    |
| `calendar`      | Calendar grid                        |
| `check`         | Checkmark                            |
| `chevron-down`  | Chevron down                         |
| `chevron-up`    | Chevron up                           |
| `circle`        | Empty circle outline                 |
| `clipboard`     | Clipboard with document              |
| `clock`         | Analog clock face                    |
| `close`         | X close button                       |
| `code`          | Angle brackets (`</>`) / code syntax |
| `copy`          | Copy-to-clipboard                    |
| `document`      | Document / page                      |
| `download`      | Download arrow                       |
| `edit`          | Pencil / edit                        |
| `eye`           | Visible / show                       |
| `eye-off`       | Hidden / hide                        |
| `file`          | Generic file                         |
| `filter`        | Filter funnel                        |
| `folder`        | Folder                               |
| `globe`         | Globe / world                        |
| `image`         | Image / photo                        |
| `info`          | Info circle                          |
| `kbd-backspace` | Backspace key icon                   |
| `kbd-cmd`       | Command key icon                     |
| `kbd-ctrl`      | Control key icon                     |
| `kbd-enter`     | Enter/Return key icon                |
| `kbd-escape`    | Escape key icon                      |
| `kbd-option`    | Option key icon                      |
| `kbd-shift`     | Shift key icon                       |
| `kbd-tab`       | Tab key icon                         |
| `link`          | Chain link                           |
| `location-pin`  | Map pin / location marker            |
| `lock`          | Locked padlock                       |
| `mic`           | Microphone                           |
| `minus`         | Minus / remove                       |
| `music`         | Music notes                          |
| `notes`         | Lined document                       |
| `pdf`           | PDF document file                    |
| `pin`           | Pin / tack                           |
| `plus`          | Plus / add                           |
| `refresh`       | Circular refresh arrows              |
| `search`        | Magnifying glass                     |
| `send`          | Send / paper plane                   |
| `settings`      | Gear / cog                           |
| `shell`         | Terminal / command prompt            |
| `smile`         | Smiley face                          |
| `star`          | Star / favorite                      |
| `stop`          | Stop / square button                 |
| `tag`           | Tag / label                          |
| `tool`          | Wrench                               |
| `trash`         | Trash bin                            |
| `unlock`        | Unlocked padlock                     |
| `upload`        | Upload arrow                         |
| `user`          | Person / user                        |
| `video`         | Video camera                         |
| `warning`       | Warning triangle                     |
| `workflow`      | Node graph                           |
| `zap`           | Lightning bolt                       |

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

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

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
