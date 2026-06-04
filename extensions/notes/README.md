# Notes

> A full-featured note-taking tool with full-text search, Markdown preview, and voice transcription via OpenAI Whisper.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.notes`  
**Permissions:** `storage` `network` `fs` `db`

---

## Overview

Notes is a keyboard-first note editor built into Nuxy. Notes are stored as individual JSON files under `~/.nuxy/data/com.nuxy.notes/` and indexed in an FTS5 SQLite database for instant full-text search. The two-panel layout shows a list of notes on the left and a Markdown-rendered preview (or live editor) on the right. An optional voice dictation feature sends audio to the OpenAI Whisper API and appends the transcript to the current note. Notes also registers as a **provider**, surfacing matching notes as inline suggestions in the omnibar when you type.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Notes**, browses the list, opens a note, edits it, and saves — all without leaving the Nuxy window.

---

## Usage

### Activation

Select **Notes** from the tool list. The left panel lists existing notes sorted by most recently updated. Type in the omnibar to filter by title or body text.

### Keyboard Shortcuts

| Key      | Action                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| `↑` `↓`  | Navigate the note list                                                                |
| `Enter`  | Open the highlighted note for editing (or create a new one if "New Note" is selected) |
| `⌃ N`    | Create a new empty note and open it in the editor                                     |
| `⌃ S`    | Save the note being edited                                                            |
| `Delete` | Delete the highlighted note                                                           |
| `Esc`    | Exit edit mode (return to preview) or return focus to the omnibar                     |

### Examples

**Example 1 — Create a note:**
Press `⌃ N` to create a new note. The editor opens with an empty body. Start typing, then press `⌃ S` to save. The title is automatically derived from the first line.

**Example 2 — Search notes:**
Type `meeting` in the omnibar. The list filters to notes whose title or body contain "meeting". The FTS5 index means results are ranked by relevance.

**Example 3 — Voice dictation:**
While a note is open, trigger the **Record** action from the command palette (or wait up to 10 seconds — recording stops automatically). After recording, the audio is sent to Whisper and the transcript is appended to the note body.

**Example 4 — Provider suggestion:**
Type anything in the omnibar outside the Notes tool. If matching notes exist they appear as inline suggestions. Select "Save as note" to create a new note from the current omnibar text and open Notes directly.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key            | Type   | Default | Description                                                                                       |
| -------------- | ------ | ------- | ------------------------------------------------------------------------------------------------- |
| `openaiApiKey` | text   | ``      | OpenAI API key used for voice-to-text transcription via Whisper (`sk-…`)                          |
| `language`     | select | `en`    | Language hint sent to the Whisper API. Options: English, Turkish, German, French, Spanish         |
| `fontSize`     | select | `14px`  | Font size inside the note body editor and Markdown preview. Options: 12px, 14px, 16px, 18px, 20px |

---

## Permissions

| Permission | Used for                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `storage`  | Reading and writing user settings (API key, language, font size)         |
| `network`  | Sending audio to the OpenAI Whisper transcription API                    |
| `fs`       | Reading and writing note JSON files under `~/.nuxy/data/com.nuxy.notes/` |
| `db`       | FTS5 SQLite index for full-text search across note titles and bodies     |

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

Voice dictation requires microphone access. The OpenAI Whisper API is called over HTTPS; an internet connection and a valid API key are required for that feature only. All notes are stored locally.

---

## Requirements

| Requirement    | Minimum version | Install                                                                              |
| -------------- | --------------- | ------------------------------------------------------------------------------------ |
| OpenAI API key | —               | [platform.openai.com](https://platform.openai.com/api-keys) _(voice dictation only)_ |

---

## Cross-Extension Integration

### This extension can be called by other extensions

`capabilities.callable: true` — call the Notes backend from another extension:

```ts
const result = await core.extensions.invoke('com.nuxy.notes', 'notes:create', {
  title: 'Meeting summary',
  body: 'Discussed Q3 roadmap...',
})
```

**Exposed IPC channels:**

| Channel                      | Payload                                         | Returns                             | Description                                                    |
| ---------------------------- | ----------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `notes:list`                 | —                                               | `Note[]`                            | Return all notes sorted by most recently updated               |
| `notes:create`               | `{ title: string, body: string }`               | `Note`                              | Create a new note                                              |
| `notes:update`               | `{ id: string, title?: string, body?: string }` | `Note`                              | Update an existing note                                        |
| `notes:delete`               | `{ id: string }`                                | `void`                              | Delete a note and remove it from the FTS index                 |
| `notes:search`               | `{ query: string }`                             | `Note[]`                            | Full-text search across titles and bodies                      |
| `notes:transcribe`           | `{ audioBuffer: number[], language?: string }`  | `{ transcript: string }`            | Transcribe audio via OpenAI Whisper                            |
| `notes:create_from_provider` | `{ text: string }`                              | `{ toolId: string, query: string }` | Create a note from omnibar text and return a navigation target |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.notes",
  "name": "Notes",
  "version": "1.0.0",
  "type": "tool",
  "icon": "notes",
  "permissions": ["storage", "network", "fs", "db"],
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
