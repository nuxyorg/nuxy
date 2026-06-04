# Shortcut Overlay

> Displays a floating keyboard-shortcut reference card over the Nuxy UI on demand.

**Type:** `helper`  
**Version:** 1.0.0  
**ID:** `com.nuxy.shortcut-overlay`  
**Permissions:** None

---

## Overview

Shortcut Overlay is a frontend-only helper that injects a dismissible overlay into the Nuxy shell listing the most commonly used keyboard shortcuts. It registers a global action (`shortcut-overlay.show`) that other extensions or shell integrations can dispatch to trigger the overlay. The card is styled entirely with Nuxy CSS custom properties, so it respects whatever theme is active.

---

## Extension Type

### `helper`

Invisible to the user in the tool list. Runs in the background and responds to the `nuxy-register-actions` event dispatched by the shell. The overlay appears only when the registered action is explicitly triggered.

---

## Usage

### Activation

The overlay is not accessible from the Nuxy tool list. It registers the action `shortcut-overlay.show` via the `nuxy-register-actions` shell event. Once registered, this action can be triggered programmatically or by any shell integration that surfaces registered actions (e.g. a command palette).

### Keyboard Shortcuts

| Key                | Action              |
| ------------------ | ------------------- |
| `Esc`              | Dismiss the overlay |
| Click outside card | Dismiss the overlay |

### Shortcuts displayed inside the overlay

The overlay itself shows the following reference shortcuts:

| Key      | Description     |
| -------- | --------------- |
| `Esc`    | Close / Hide    |
| `↑ ↓`    | Navigate list   |
| `↵`      | Select item     |
| `⌫`      | Go back / Clear |
| `Ctrl+K` | Command palette |

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

All platforms supported by Nuxy. No native system tools required.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.shortcut-overlay",
  "name": "Shortcut Overlay",
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
