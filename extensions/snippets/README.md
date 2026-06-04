# Snippets

> Save, search, and instantly copy reusable text snippets from the Nuxy shell.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.snippets`  
**Permissions:** `storage` `clipboard`

---

## Overview

Snippets is a personal text-snippet manager built into Nuxy. Users can store frequently used pieces of text — commands, templates, URLs, code fragments — tag them for quick retrieval, and copy them to the clipboard with a single key press. Snippets are persisted to extension storage so they survive restarts. The extension also supports saving the current clipboard contents directly as a new snippet without any typing.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user selects **Snippets** from the shell and then types into the omnibar to filter their saved snippets in real time.

---

## Usage

### Activation

Select **Snippets** from the tool list. The list of saved snippets appears immediately. Type in the omnibar to filter by title, content, or tags.

### Keyboard Shortcuts

| Key     | Action                                           |
| ------- | ------------------------------------------------ |
| `↑` `↓` | Navigate snippet list                            |
| `Enter` | Copy selected snippet to clipboard               |
| `N`     | Save current clipboard contents as a new snippet |
| `D`     | Delete the selected snippet                      |
| `Esc`   | Return to the tool list                          |

### Examples

**Example 1 — Copy a snippet:**
Open Snippets, navigate to a saved SSH command with `↓`, and press `Enter`. The content is copied to the clipboard and the window closes automatically (configurable).

**Example 2 — Save from clipboard:**
Copy a long bash one-liner, open Snippets, and press `N`. The clipboard content is saved as a new snippet whose title is auto-generated from the first 40 characters of the text.

**Example 3 — Filtered search:**
Type `docker` in the omnibar to narrow the list to only snippets whose title, content, or tags contain "docker".

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key              | Type   | Default | Description                                    |
| ---------------- | ------ | ------- | ---------------------------------------------- |
| `closeAfterCopy` | toggle | `true`  | Hide the Nuxy window after copying a snippet   |
| `defaultTags`    | list   | `[]`    | Default tags applied to newly created snippets |

---

## Permissions

| Permission  | Used for                                                                               |
| ----------- | -------------------------------------------------------------------------------------- |
| `storage`   | Persisting snippets to `snippets.json` in extension storage                            |
| `clipboard` | Reading clipboard text when saving a new snippet; writing snippet content when copying |

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

---

## Cross-Extension Integration

### This extension can be called by other extensions

`capabilities.callable: true` — other extension backends can invoke Snippets channels directly:

```ts
const result = await core.extensions.invoke('com.nuxy.snippets', 'getSnippets', { query: 'docker' })
```

**Exposed IPC channels:**

| Channel                  | Payload                                               | Returns            | Description                                                                           |
| ------------------------ | ----------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `getSnippets`            | `{ query?: string }`                                  | `Snippet[]`        | List all snippets, optionally filtered by query string (matches title, content, tags) |
| `addSnippet`             | `{ title: string, content: string, tags?: string[] }` | `Snippet`          | Create and persist a new snippet                                                      |
| `deleteSnippet`          | `{ id: string }`                                      | `Snippet[]`        | Delete a snippet by ID; returns the updated list                                      |
| `copySnippet`            | `{ id: string }`                                      | `{ copied: true }` | Write the snippet's content to the clipboard                                          |
| `saveClipboardAsSnippet` | `{}`                                                  | `Snippet`          | Read the current clipboard and save it as a new snippet                               |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.snippets",
  "name": "Snippets",
  "version": "1.0.0",
  "type": "tool",
  "icon": "snippet",
  "permissions": ["storage", "clipboard"],
  "capabilities": {
    "callable": true,
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
