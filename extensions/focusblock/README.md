# Focus Block

> A Pomodoro-style countdown timer that helps you stay focused by tracking timed work sessions.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.focusblock`  
**Permissions:** `storage`

---

## Overview

Focus Block is a keyboard-driven focus timer built around the Pomodoro technique. Start a countdown session from the omnibar, watch it tick down with a circular progress ring, and review your session history when you're done. It stores up to 20 past sessions so you can see whether blocks were completed or stopped early.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **Focus Block** from the tool list. The extension opens immediately and shows either the session history or a prompt to start a new block.

### Keyboard Shortcuts

| Key     | Action                                      |
| ------- | ------------------------------------------- |
| `Enter` | Start a new timer (or stop the running one) |
| `S`     | Stop the running timer                      |
| `↑` `↓` | Navigate the session history list           |

### Examples

**Example 1 — Default duration:**
Open Focus Block and press `Enter` to start a 25-minute (Pomodoro) session. A circular progress ring and countdown clock appear.

**Example 2 — Custom duration:**
Type `45` in the omnibar, then press `Enter` to start a 45-minute session.

**Example 3 — Labelled session:**
Type `45 deep work` in the omnibar and press `Enter`. The label "deep work" is shown under the countdown and stored in the session history.

**Example 4 — Stop early:**
Press `S` or `Enter` while a timer is running to stop it. The session is saved with status "Stopped".

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key               | Type   | Default | Description                                                                                                |
| ----------------- | ------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `defaultDuration` | select | `25`    | Default focus block duration when none is specified in the query. Options: 15, 20, 25, 30, 45, 60 minutes. |
| `breakDuration`   | select | `5`     | Suggested break duration shown after a focus block completes. Options: 5, 10, 15 minutes.                  |

---

## Permissions

| Permission | Used for                                                      |
| ---------- | ------------------------------------------------------------- |
| `storage`  | Persisting session history (up to 20 entries) across restarts |

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

All platforms supported by Nuxy.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.focusblock",
  "name": "Focus Block",
  "version": "1.0.0",
  "type": "tool",
  "icon": "timer",
  "permissions": ["storage"],
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
