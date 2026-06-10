# Extension Name

> One-sentence description of what this extension does.

<!-- Delete the badges that don't apply. Keep the type badge and at least one permission badge (or "No permissions"). -->

**Type:** `tool` | `provider` | `orchestrator` | `helper` | `theme` | `iconpack` | `uikit`  
**Version:** 1.0.0  
**ID:** `com.nuxy.<name>`  
**Permissions:** `clipboard` `storage` `network` `notifications` `media` `shell` `fs` `db` _(or "None")_

---

## Overview

<!--
2–4 sentences. Answer: what problem does this solve? What does a user get from it?
Skip implementation details — those belong in the code.
-->

Describe what the extension does, why it exists, and what kind of user would find it useful.

---

## Extension Type

<!--
Pick the one that applies and delete the rest. Brief reminder of what the type means.
-->

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

### `provider`

Runs inline inside the shell — provides a result or suggestion without the user navigating away (e.g. a calculator that shows the result directly under the query).

### `orchestrator`

Coordinates multiple other extensions. Calls other extension backends via `core.extensions.invoke` and aggregates or routes their results.

### `helper`

Invisible to the user. Runs in the background or responds to events dispatched by other extensions. Never appears in the tool list.

### `theme`

Supplies a set of CSS custom-property values that replace the active visual theme. Activated by setting `theme = <name>` in `~/.nuxy/nuxyconfig`.

### `iconpack`

Supplies a set of named SVG icons. Loaded at startup; icons are accessed by name via `window.core.icons.get(name, pack?)`.

### `uikit`

Overrides or extends `window.UI` components before the shell boots. No backend worker.

---

## Usage

<!--
Skip this section entirely for: theme, iconpack, uikit, and helper extensions with no user-facing interaction.
-->

### Activation

<!--
Describe how the user opens / triggers this extension.
Examples:
- "Select **Calculator** from the tool list and type a math expression."
- "Paste a URL into the omnibar after selecting **Video Downloader**."
- "Always active in the background — no manual activation required." (for helpers/providers)
-->

Describe activation here.

### Keyboard Shortcuts

<!--
List every key binding the extension registers. Use the table below.
Delete this section if the extension has no interactive frontend.
-->

| Key       | Action               |
| --------- | -------------------- |
| `↑` `↓`   | Navigate list        |
| `Enter`   | Select / confirm     |
| `⇧ Enter` | Secondary action     |
| `Esc`     | Go back / clear      |
| `D`       | Delete selected item |

### Examples

<!--
Show 1–3 realistic use cases. Use inline code for query strings, key presses, or file paths.
-->

**Example 1 — Basic use:**
Type `42 * 7` → result appears immediately below the query.

**Example 2 — Secondary action:**
Select a result and press `⇧ Enter` to copy it to clipboard instead of opening it.

**Example 3 — With settings:**
Configure the default output folder in Settings (`⌘ ,`), then drop a URL and press `Enter` to download.

---

## Settings

<!--
List every user-configurable option declared in settings.json.
Delete this section if the extension has no settings.json.
-->

Settings are accessible from the Nuxy **Settings** tool.

| Key         | Type     | Default                  | Description                         |
| ----------- | -------- | ------------------------ | ----------------------------------- |
| `host`      | text     | `http://localhost:11434` | Server URL                          |
| `outputDir` | location | `~/Downloads`            | Where files are saved               |
| `audioOnly` | toggle   | `false`                  | Download audio track only           |
| `format`    | select   | `mp4`                    | Output format: `mp4`, `webm`, `mkv` |

---

## Permissions

<!--
List only the permissions declared in manifest.json.
Explain specifically what each one is used for in this extension.
Delete this section for extensions with no permissions (theme / iconpack / uikit).
-->

| Permission      | Used for                                               |
| --------------- | ------------------------------------------------------ |
| `storage`       | Saving history / cached data                           |
| `clipboard`     | Reading the current clipboard contents                 |
| `network`       | Fetching remote data / calling an API                  |
| `media`         | Reading now-playing track info                         |
| `shell`         | Running external CLI tools (`yt-dlp`, `ffmpeg`, …)     |
| `fs`            | Reading or writing files outside the extension sandbox |
| `db`            | Full-text search index via SQLite                      |
| `notifications` | Showing system notifications on completion             |

---

## Localization

<!--
List supported locales. Delete this section for extensions with no locales block in the manifest.
-->

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

<!--
Be specific. Nuxy runs on Linux (X11 / Wayland) and macOS.
If the extension relies on a system tool (e.g. `xdotool`, `wmctrl`, `yt-dlp`), it only works where that tool is available.
If there are no restrictions, write "All platforms supported by Nuxy."
-->

| Platform        | Supported | Notes                              |
| --------------- | --------- | ---------------------------------- |
| Linux (X11)     | Yes       |                                    |
| Linux (Wayland) | Partial   | `xdotool` not available on Wayland |
| macOS           | Yes       |                                    |

**Desktop environments:** Works on any DE (GNOME, KDE, i3, Hyprland, …) unless a specific Wayland compositor restriction applies.

---

## Requirements

<!--
List external tools, services, or runtime dependencies the user must install separately.
Delete this section if there are no external requirements.
-->

| Requirement | Minimum version | Install                        |
| ----------- | --------------- | ------------------------------ |
| `yt-dlp`    | latest          | `pip install yt-dlp`           |
| `ffmpeg`    | 4.x             | `sudo apt install ffmpeg`      |
| Ollama      | 0.1.x           | [ollama.ai](https://ollama.ai) |

---

## Cross-Extension Integration

<!--
Delete this section if capabilities.callable is false AND capabilities.caller is false.
-->

### This extension can be called by other extensions

Set `capabilities.callable: true` in your manifest, then call it from another backend:

```ts
const result = await core.extensions.invoke('com.nuxy.<name>', 'channelName', { key: 'value' })
```

**Exposed IPC channels:**

| Channel       | Payload          | Returns              | Description                 |
| ------------- | ---------------- | -------------------- | --------------------------- |
| `doSomething` | `{ id: string }` | `{ result: string }` | Description of what it does |

### This extension calls other extensions

Requires `capabilities.caller: true` in the manifest. Currently calls:

- `com.nuxy.other-ext` → channel `someChannel`

---

## Manifest Reference

<!--
Copy the actual manifest.json content here for quick reference.
-->

```json
{
  "id": "com.nuxy.<name>",
  "name": "Extension Name",
  "version": "1.0.0",
  "type": "tool",
  "icon": "icon-name",
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
