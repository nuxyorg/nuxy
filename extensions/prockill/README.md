# Process Killer

> Search running processes and terminate them with a graceful or forced signal.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.prockill`  
**Permissions:** `shell`

---

## Overview

Process Killer gives you a fast, keyboard-driven way to find and kill any running process without leaving Nuxy. It reads the live process list via `ps aux`, filters it by name or command as you type, and lets you send `SIGTERM` (graceful) or `SIGKILL` (forced) with a single keystroke. System processes owned by `root` are hidden by default and can be shown via settings.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Process Killer** from the shell, then types a process name to filter the list and uses keyboard shortcuts to terminate processes.

---

## Usage

### Activation

Select **Process Killer** from the tool list. The full list of user processes loads immediately. Start typing in the omnibar to filter by process name or command path.

### Keyboard Shortcuts

| Key       | Action                                                        |
| --------- | ------------------------------------------------------------- |
| `↑` `↓`   | Navigate the process list                                     |
| `Enter`   | Send `SIGTERM` to the selected process (graceful termination) |
| `⇧ Enter` | Send `SIGKILL` to the selected process (forced termination)   |
| `R`       | Refresh the process list                                      |

### Examples

**Example 1 — Kill a hung application:**
Type `firefox` → select the process with `↓` → press `Enter` to send `SIGTERM`.

**Example 2 — Force-kill a frozen process:**
Type `code` → navigate to the correct entry → press `⇧ Enter` to send `SIGKILL` immediately.

**Example 3 — Refresh after killing:**
Press `R` at any time to reload the process list and confirm the process has exited.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key                   | Type   | Default   | Description                                                    |
| --------------------- | ------ | --------- | -------------------------------------------------------------- |
| `showSystemProcesses` | toggle | `false`   | Include root/system-owned processes in the list                |
| `defaultSignal`       | select | `SIGTERM` | Default kill signal: `SIGTERM` (graceful) or `SIGKILL` (force) |

---

## Permissions

| Permission | Used for                                                        |
| ---------- | --------------------------------------------------------------- |
| `shell`    | Running `ps aux` to list processes and `kill` to terminate them |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

Relies on standard POSIX tools (`ps`, `kill`) available on all supported platforms. No additional dependencies required.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.prockill",
  "name": "Process Killer",
  "version": "1.0.0",
  "type": "tool",
  "icon": "process",
  "permissions": ["shell"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```
