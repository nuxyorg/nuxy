# Nuxy Shell

> The bootstrap launcher shell that powers the Nuxy omnibar, tool list, provider display, and command palette.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.shell`  
**Permissions:** `storage`

---

## Overview

Nuxy Shell is the core UI of the entire application. It is the first extension loaded (`bootstrap: true`) and its frontend becomes the root component that every other extension lives inside. It renders the omnibar, discovers and lists all registered tools and providers, handles keyboard navigation, loads active tool frontends on demand, and displays the command palette. Without the Shell extension Nuxy has no visible interface.

Because it is a bootstrap extension, it cannot be disabled and it is always loaded before any other extension.

---

## Extension Type

### `tool`

The Shell is registered as a tool type, but its role is special: it is the root host for all other tool frontends. When a user selects a tool, the Shell dynamically imports that tool's `frontend.js` via the `nuxy-ext://` protocol and mounts it inside its own layout.

---

## Usage

### Activation

The Shell is always active. Nuxy opens directly into the Shell's omnibar. No manual activation is required.

### Keyboard Shortcuts

**In the tool list (no active tool):**

| Key     | Action                                                                        |
| ------- | ----------------------------------------------------------------------------- |
| `↓` `↑` | Navigate the tool/result list                                                 |
| `→`     | Accept the highlighted item's name into the omnibar                           |
| `Enter` | Open the highlighted tool/result, or the first match when none is highlighted |

**Inside an active tool:**

| Key                            | Action                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| `Backspace` _(on empty query)_ | Exit the current tool and return to the tool list                 |
| `Ctrl K`                       | Open the command palette for the active tool's registered actions |

**Command palette:**

| Key     | Action                      |
| ------- | --------------------------- |
| `↑` `↓` | Navigate actions            |
| `Enter` | Execute the selected action |
| `Esc`   | Close the command palette   |

### Examples

**Example 1 — Open a tool:**
Type `calc` → `Enter` to open Calculator (or `↓` to pick a different match first).

**Example 2 — Return to the tool list:**
While inside any tool, clear the omnibar and press `Backspace` to go back.

**Example 3 — Run a tool action:**
While inside Ollama, press `Ctrl K` to open the command palette, then select **Models** to switch the active model.

**Example 4 — Orchestrator routing:**
If an orchestrator extension is installed, type a natural-language query with no tool selected and press `Enter`. The Shell forwards the text to the orchestrator's `route` channel and opens the suggested tool automatically.

---

## Permissions

| Permission | Used for                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `storage`  | Persisting the list of recently used tools (up to the last 10) so they appear at the top of the tool list |

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

The Shell uses standard Web APIs (Canvas, ResizeObserver, MutationObserver, CustomEvent) and has no platform-specific dependencies.

---

## Cross-Extension Integration

### This extension calls other extensions

`capabilities.caller: true` — the Shell invokes other extensions when the user selects them and may forward queries to an orchestrator for automatic routing.

- Any registered `tool` extension → dynamic `frontend.js` import via `nuxy-ext://`
- Any registered `orchestrator` extension → channel `route` with `{ text: string }`

**IPC channels exposed by the Shell backend:**

| Channel          | Payload          | Returns    | Description                                                      |
| ---------------- | ---------------- | ---------- | ---------------------------------------------------------------- |
| `getRecentTools` | —                | `string[]` | Returns the ordered list of recently used tool IDs (max 10)      |
| `recordToolUsed` | `toolId: string` | `string[]` | Prepends a tool ID to the recent list and persists it to storage |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.shell",
  "name": "Nuxy Shell",
  "version": "1.0.0",
  "type": "tool",
  "icon": "shell",
  "bootstrap": true,
  "permissions": ["storage"],
  "capabilities": {
    "callable": false,
    "caller": true
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```
