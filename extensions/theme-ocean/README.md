# Ocean Theme

> A deep-sea dark colour palette for Nuxy with navy backgrounds, teal accents, and warm amber highlights.

**Type:** `theme`  
**Version:** 1.0.0  
**ID:** `com.nuxy.theme-ocean`  
**Permissions:** None

---

## Overview

Ocean Theme replaces Nuxy's active visual theme with a deep-sea inspired palette. The base background is a dark navy (`#0a1628`), accented by teal operators, warm amber constants, and soft blue keywords. Scrollbars are styled with translucent white to blend naturally against the dark background. It is well-suited for users who prefer high-contrast dark themes with cool-toned colours.

---

## Extension Type

### `theme`

Supplies a set of CSS custom-property values that replace the active visual theme. Activated by setting `theme = ocean` in `~/.nuxy/nuxyconfig`.

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
  "id": "com.nuxy.theme-ocean",
  "name": "Ocean Theme",
  "version": "1.0.0",
  "type": "theme",
  "permissions": [],
  "entry": {
    "theme": "theme.json"
  }
}
```
