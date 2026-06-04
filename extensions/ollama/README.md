# Ollama

> Conversational AI assistant powered by a local Ollama model.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.ollama`  
**Permissions:** `storage` `network`

---

## Overview

Ollama brings a full chat interface directly into Nuxy, powered by any model running locally via [Ollama](https://ollama.ai). Type a question or prompt into the omnibar and get a streamed, Markdown-rendered reply without leaving the launcher. Conversation history is persisted across sessions, and the active model is shown in the footer hint so you always know what you're talking to.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Ollama** from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **Ollama** from the tool list. The omnibar placeholder changes to "Ask anything". Type your prompt and press `Enter` to send it.

### Keyboard Shortcuts

| Key                          | Action                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `Enter`                      | Send the current query to the model                                                 |
| `Enter` _(while generating)_ | Queue the typed message — it sends automatically when the current response finishes |
| `Esc`                        | Stop the in-progress generation                                                     |

### Examples

**Example 1 — Basic question:**
Type `What is a kernel syscall?` and press `Enter`. The response streams in word-by-word with Markdown formatting.

**Example 2 — Queue a follow-up:**
While the model is generating, type your next question and press `Enter`. It is queued and sent automatically when the current reply finishes.

**Example 3 — Switch model on the fly:**
Open the Command Palette (`Ctrl K`) and select **Models**, then pick a different model. Subsequent messages use the newly selected model.

**Example 4 — Clear history:**
Open the Command Palette (`Ctrl K`) and select **Clear Chat History** to start a fresh conversation.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key             | Type   | Default                  | Description                                                                               |
| --------------- | ------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| `host`          | text   | `http://localhost:11434` | URL where the Ollama server is running                                                    |
| `model`         | text   | `llama3`                 | Model name to use for chat (e.g. `llama3`, `mistral`)                                     |
| `thinkingColor` | select | `light`                  | Border animation shown while the model is generating: `light`, `rainbow`, `bit`, or `off` |
| `systemPrompt`  | text   | _(empty)_                | System-level instructions prepended to every conversation                                 |
| `temperature`   | select | `0.7`                    | Output randomness — `0.2` (deterministic) through `1.0` (maximum creativity)              |

---

## Permissions

| Permission | Used for                                                     |
| ---------- | ------------------------------------------------------------ |
| `storage`  | Persisting chat history and configuration between sessions   |
| `network`  | Calling the local Ollama REST API (`/api/chat`, `/api/tags`) |

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

**Note:** The extension communicates with Ollama over HTTP — no shell access required. It works on any platform where Ollama is reachable at the configured host URL.

---

## Requirements

| Requirement | Minimum version | Install                        |
| ----------- | --------------- | ------------------------------ |
| Ollama      | 0.1.x           | [ollama.ai](https://ollama.ai) |

At least one model must be pulled before use: `ollama pull llama3`.

---

## Cross-Extension Integration

### This extension can be called by other extensions

`capabilities.callable: true` — other extension backends can send a single query or a full message thread:

```ts
// Single prompt
const result = await core.extensions.invoke('com.nuxy.ollama', 'query', {
  prompt: 'Summarize this text: ...',
})

// Full chat thread
const result = await core.extensions.invoke('com.nuxy.ollama', 'chat', {
  messages: [{ role: 'user', content: 'Hello!' }],
})
```

**Exposed IPC channels:**

| Channel         | Payload                                                          | Returns               | Description                                            |
| --------------- | ---------------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| `chat`          | `{ messages: ChatMessage[] }`                                    | `{ content: string }` | Send a full message array and get the assistant reply  |
| `query`         | `{ prompt: string, model?: string }`                             | `{ content: string }` | Single-turn prompt shorthand                           |
| `models`        | —                                                                | `string[]`            | List all models available in the local Ollama instance |
| `health`        | —                                                                | `{ ok: boolean }`     | Check whether the Ollama server is reachable           |
| `configure`     | `{ model?, host?, thinkingColor?, systemPrompt?, temperature? }` | `void`                | Update runtime config and persist settings             |
| `getConfig`     | —                                                                | `OllamaConfig`        | Read the current runtime configuration                 |
| `history:save`  | `{ messages: ChatMessage[] }`                                    | `void`                | Overwrite the stored chat history                      |
| `history:load`  | —                                                                | `ChatMessage[]`       | Load the stored chat history                           |
| `history:clear` | —                                                                | `void`                | Delete all stored chat history                         |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.ollama",
  "name": "Ollama",
  "version": "1.0.0",
  "type": "tool",
  "icon": "ai",
  "description": "Conversational AI assistant powered by a local Ollama model.",
  "placeholder": "Ask anything",
  "permissions": ["storage", "network"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```
