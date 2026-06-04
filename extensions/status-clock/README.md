# Status Clock

> Shows a live clock in the bottom-right corner of the Nuxy window.

**Type:** `helper`  
**Version:** 1.0.0  
**ID:** `com.nuxy.status-clock`  
**Permissions:** None

---

## Overview

Status Clock is a lightweight background helper that injects a non-interactive clock widget into the Nuxy shell UI. The clock updates every second and is positioned in the bottom-right corner of the window using CSS custom properties, so it adapts automatically to any active theme. Both 12-hour and 24-hour formats are supported and seconds display is configurable.

---

## Extension Type

### `helper`

Invisible to the user in the tool list. Attaches itself to the shell on the `nuxy-shell-mounted` event and ticks independently in the background. Re-reads settings whenever a `nuxy-settings-updated` event is dispatched for this extension ID.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key           | Type   | Default | Description                                                        |
| ------------- | ------ | ------- | ------------------------------------------------------------------ |
| `format`      | select | `24h`   | Time display format: `24h` (24-hour) or `12h` (12-hour with AM/PM) |
| `showSeconds` | toggle | `true`  | Whether to show the seconds component in the clock                 |

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

All platforms supported by Nuxy. No external dependencies.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.status-clock",
  "name": "Status Clock",
  "version": "1.0.0",
  "type": "helper",
  "permissions": [],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```
