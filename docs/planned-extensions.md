# Planned Extensions — Feature List & Implementation Strategy

> **Date:** 2026-05-25
> **Scope:** Feature list and implementation strategy for 6 new extensions + 1 feature addition.

---

## Overview

Each new feature is implemented as a Nuxy extension — an independent `backend.js` + optional `frontend.js` pair. This architecture keeps the Electron main process clean, enforces the sandbox permission model, and lets each extension be tested and deployed independently.

**Build order (recommended):** Ollama → Notes (+ Voice Notes) → Bitwarden → Video Downloader → n8n → Calendar

---

## Orchestrator Subtypes

The existing `ai-orchestrator` (`com.nuxy.ai-orchestrator`) is a **tool caller**: it uses `functiongemma` to match user intent to callable extensions. Ollama will be a second orchestrator with a different role — **chatbot**: it handles open-ended conversation when no tool matches.

The `manifest.json` schema gains an `orchestratorType` field:

```json
{
  "type": "orchestrator",
  "orchestratorType": "tool_caller" | "chatbot"
}
```

### How the two orchestrators interact

```
User presses Enter in OmniBar
        │
        ▼
  ai-orchestrator (tool_caller)
        │
        ├─ functiongemma finds a matching tool ──► invoke target extension ──► show result
        │
        └─ no tool matches
                │
                ▼
          core.extensions.invoke('com.nuxy.ollama', 'chat', { messages })
                │
                ▼
          Ollama chatbot replies ──► broadcast answer to shell UI
```

When `functiongemma` returns no `tool_calls`, `ai-orchestrator` delegates to Ollama via `core.extensions.invoke` instead of broadcasting `functiongemma`'s direct answer. If Ollama is not running or not installed, the fallback is to broadcast `functiongemma`'s direct answer as before (graceful degradation).

### Required change to `ai-orchestrator`

The `No tool call — plain text answer` branch in `handleRoute` becomes:

```js
// Try to delegate to Ollama chatbot; fall back to functiongemma's direct answer
try {
  const ollamaResult = await core.extensions.invoke(
    'com.nuxy.ollama',
    'chat',
    { messages }          // pass the full conversation so Ollama has context
  )
  broadcastResult(core, { type: 'direct', query: rawText, answer: ollamaResult.content })
} catch (_) {
  // Ollama not available — use functiongemma's answer
  broadcastResult(core, { type: 'direct', query: rawText, answer: assistantMsg.content ?? '' })
}
```

No other changes to `ai-orchestrator` are needed.

---

## 1. Ollama — Local LLM / AI Chatbot

### Purpose
Provide a conversational AI layer backed by a locally-running Ollama instance (`localhost:11434`). Acts as the chatbot fallback for `ai-orchestrator` and is also directly accessible as a standalone chat UI.

### Manifest
```json
{
  "id": "com.nuxy.ollama",
  "name": "Ollama",
  "version": "1.0.0",
  "type": "orchestrator",
  "orchestratorType": "chatbot",
  "permissions": [],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

`callable: true` is required so `ai-orchestrator` can invoke it via `core.extensions.invoke`.

### Dependencies
- `ollama` binary installed and `ollama serve` running at `localhost:11434`
- No NPM dependencies — uses built-in `fetch`

### Backend IPC Channels
```
chat       ({ messages: Array<{role, content}> })  → { content: string }
query      ({ model, prompt })                     → { content: string }
models     ()                                      → string[]
health     ()                                      → { ok: boolean }
configure  ({ model, host })                       → void
```

- `chat` is the primary channel called by `ai-orchestrator`. Accepts the full message array so context is preserved across the delegation chain.
- Conversation history for direct UI interactions is kept in-memory in the backend (per-session, not persisted).
- `POST /api/chat` with `stream: false` — streaming is a second-phase addition.
- Model and host are persisted to `core.storage` via `configure`; defaults to `llama3` / `localhost:11434`.

### Frontend
- Model picker dropdown
- Chat bubble list (`Card` + `List` from `@nuxy/ui`)
- Input bar with send button; `Esc` closes the window

### Complexity
**Low-Medium.** The REST API is straightforward. The main effort is the chat UI and wiring the `callable` IPC channel correctly.

### Tests
- Mock `fetch` — verify `chat` constructs the correct `POST /api/chat` payload
- Verify `health` returns `{ ok: false }` on network error without throwing
- Verify `configure` persists and restores model/host across handler restarts

---

## 2. Notes — Note-Taking with Voice Input

### Purpose
Create, list, search, and delete Markdown notes from Nuxy. Voice input (via OpenAI Whisper) is a built-in feature of this extension — not a separate extension.

### Manifest
```json
{
  "id": "com.nuxy.notes",
  "name": "Notes",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage", "media"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

`media` permission is required for microphone access. `callable: true` allows Ollama or Calendar to create notes cross-extension.

### Dependencies
- `node:fs` + `node:sqlite` (FTS5 for search)
- OpenAI Whisper API (optional — only for voice input; configured with an API key)

### Backend IPC Channels

**Note CRUD:**
```
notes:list      ()                                  → Note[]
notes:create    ({ title, body })                   → Note
notes:update    ({ id, title, body })               → Note
notes:delete    ({ id })                            → void
notes:search    ({ query })                         → Note[]
```

**Voice input:**
```
notes:transcribe  ({ audioBuffer: ArrayBuffer, language? })  → { transcript: string }
```

- Notes are stored as `.md` files under `~/.nuxy/data/com.nuxy.notes/<id>.md`
- SQLite FTS5 table mirrors title + body for full-text search (same pattern as `angrysearch`)
- `notes:transcribe` receives a raw audio buffer from the renderer, writes it to a temp file in `os.tmpdir()`, POSTs to `https://api.openai.com/v1/audio/transcriptions` as `multipart/form-data` using `node:https`, then deletes the temp file in a `finally` block. On success the transcript is returned to the frontend; the frontend then calls `notes:create`.
- Whisper API key is stored via `notes:configure` → `core.storage`. If not configured, the voice button in the UI is disabled.

### Frontend
- Left panel: note list (`List` component) with search input
- Right panel: `textarea` for editing (Markdown preview is phase 2)
- Voice button: opens a recording modal — large record button, live audio waveform (CSS animation), status text ("Recording…", "Transcribing…"). On completion the transcript is inserted into the editor.
- Keyboard: `Ctrl+N` new note, `Ctrl+D` delete, `Esc` close

### Complexity
**Medium.** SQLite + FTS is established pattern. Whisper multipart upload and the `media` permission bridge are the careful parts.

### Tests
- CRUD handlers: spy on `fs` and `DatabaseSync`; verify correct file paths
- FTS query: verify it handles special characters and empty strings safely
- `notes:transcribe`: mock `node:https` request; verify multipart payload structure; verify temp file is deleted even when the API throws

---

## 3. Bitwarden — Password Manager

### Purpose
Search the Bitwarden vault from Nuxy and copy credentials to the clipboard.

### Manifest
```json
{
  "id": "com.nuxy.bitwarden",
  "name": "Bitwarden",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["clipboard", "storage"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

### Dependencies
- **Preferred:** `rbw` (unofficial Rust CLI — manages its own daemon, no session token needed per call)
- **Fallback:** `bw` (official Bitwarden CLI — requires `bw unlock` and a session token)
- Binary must be present: checked at startup via `which rbw` or `which bw`

### Backend IPC Channels
```
bw:search       ({ query })                → VaultItem[]
bw:getPassword  ({ id })                   → { password: string }
bw:getTotp      ({ id })                   → { code: string }
bw:status       ()                         → { locked: boolean, backend: 'rbw'|'bw' }
bw:unlock       ({ password? })            → { ok: boolean }   // bw path only
```

**Security rules:**
- Passwords are never written to `core.storage` or logged
- After copying, the clipboard is cleared after 30 seconds via `setTimeout`
- `rbw` uses the system keyring; Nuxy never sees the master password
- For the `bw` path, the session token is cached in memory only (not persisted to disk)

### Frontend
- Search box → result list (site name + username)
- Per-row actions: Copy Password, Copy Username, Copy TOTP
- If vault is locked: full-screen "Unlock" prompt

### Complexity
**Medium.** The `execFile` pattern is taken directly from `angrysearch`. The security layer and both CLI paths need care.

### Tests
- Spy on `child_process.execFile`; verify correct CLI arguments for both `rbw` and `bw` paths
- Test output parser for `rbw list` against sample outputs
- Verify clipboard-clear timer fires after 30 s using `vi.useFakeTimers()`

---

## 4. Video Downloader — yt-dlp

### Purpose
Paste a URL, pick a format, download in the background. Covers any site `yt-dlp` supports.

### Manifest
```json
{
  "id": "com.nuxy.video-downloader",
  "name": "Video Downloader",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

### Dependencies
- `yt-dlp` binary (checked at startup via `which yt-dlp`)
- Output directory: configurable, defaults to `~/Downloads`

### Backend IPC Channels
```
ytdlp:getFormats  ({ url })                         → Format[]
ytdlp:download    ({ url, formatId, outputDir })    → { jobId: string }
ytdlp:queue       ()                                → Job[]
ytdlp:cancel      ({ jobId })                       → void
ytdlp:configure   ({ outputDir })                   → void
```

- `getFormats` uses `execFile('yt-dlp', ['-J', '--no-download', url])` and parses JSON
- `download` uses `spawn` with `--newline`; each stdout line is parsed for `[download] XX%` progress and broadcast back to the renderer
- Active jobs are tracked in a `Map<jobId, { process, url, progress }>` in the backend
- Cancel: `process.kill('SIGTERM')`

### Frontend
- URL input → "Get Formats" → format list (resolution + codec + size)
- Download queue: progress bar + cancel button per job
- Completed jobs: "Show in Folder" button (via Electron `shell.showItemInFolder` — needs a new `core.shell.showInFolder` IPC bridge or can be handled on the renderer side via a preload API)

### Complexity
**Medium.** `spawn` + progress line parsing is the tricky part. Format list parsing is straightforward.

### Tests
- Spy on `child_process.execFile` and `child_process.spawn`
- Unit-test the JSON format parser against a real `yt-dlp -J` sample output
- Unit-test the progress regex against multiple `yt-dlp --newline` output variants

---

## 5. n8n — Workflow Automation

### Purpose
Connect to a running n8n instance, list workflows, trigger them, and see recent execution status.

### Manifest
```json
{
  "id": "com.nuxy.n8n",
  "name": "n8n",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

### Dependencies
- Running n8n instance (local or remote) — default `http://localhost:5678`
- n8n API key (stored encrypted in `core.storage`)
- No NPM dependencies — built-in `fetch`

### Backend IPC Channels
```
n8n:configure       ({ baseUrl, apiKey })                  → void
n8n:status          ()                                     → { ok: boolean, version: string }
n8n:listWorkflows   ()                                     → Workflow[]
n8n:triggerWebhook  ({ webhookPath, payload })             → { status: number, body: any }
n8n:execute         ({ workflowId })                       → { executionId: string }
n8n:executions      ({ workflowId, limit? })               → Execution[]
```

Two trigger mechanisms:
1. **Webhook trigger** — `POST /webhook/<path>` (no API key required in n8n 1.x)
2. **Manual execute** — `POST /api/v1/workflows/<id>/run` (requires API key)

API key is stored via `core.storage` (phase 2: Electron `safeStorage` encryption).

### Frontend
- First launch: configure screen (Base URL + API key)
- Main view: workflow list with search and "Run" button
- Execution history panel: last 5 runs per workflow, color-coded status (green/red/yellow)

### Complexity
**Medium.** API is simple; configuration UX needs care.

### Tests
- Mock global `fetch`; test happy path, error, and timeout scenarios
- Verify API key is written and read back correctly from storage
- Verify `n8n:status` returns `{ ok: false }` on network error without throwing

---

## 6. Calendar / Reminder

### Purpose
Create events, view upcoming schedule, and receive system notifications for reminders.

### Manifest
```json
{
  "id": "com.nuxy.calendar",
  "name": "Calendar",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

`callable: true` — Ollama or the AI orchestrator can create events cross-extension.

### Dependencies
- `node:sqlite` for local storage — CalDAV / Google Calendar in phase 2
- System notifications via Electron `Notification` API (needs an IPC bridge to main process)

### Backend IPC Channels
```
calendar:list    ({ from, to })                            → Event[]
calendar:create  ({ title, datetime, notes, remindMin })  → Event
calendar:update  ({ id, ...fields })                      → Event
calendar:delete  ({ id })                                 → void
```

- Reminder loop: `setInterval(60_000)` checks for events whose reminder time has passed and fires a notification
- Notifications: `core.ipc.handle('calendar:notify', ...)` on the main process side — see **Shared Infrastructure** below
- Recurrence (daily/weekly): implemented as a simple internal rule set (no external `rrule` dependency)

### Frontend
- Today's events + next 3 upcoming events on the main view
- Quick-add via natural language: `"Doctor tomorrow at 14:00"` — NLP parsing via Ollama (phase 2)
- Mini 7×5 calendar grid for navigation

### Complexity
**Medium-High.** Notification bridge and recurrence logic need care. Google Calendar is phase 2.

### Tests
- CRUD handlers with SQLite in-memory DB
- Reminder loop with `vi.useFakeTimers()` — verify the correct events trigger notifications
- Recurrence edge cases: month-end roll-over, DST transitions

---

## Implementation Phases

### Phase 1 — Independent, low-risk (weeks 1-2)
| # | Extension | Why first |
|---|-----------|-----------|
| 1 | **Ollama** | No system deps beyond a running `ollama serve`; unlocks AI chatbot fallback for `ai-orchestrator` |
| 2 | **Notes + Voice** | Fully internal; `callable: true` makes it useful for other extensions from day one |
| 3 | **Video Downloader** | `execFile` pattern borrowed directly from `angrysearch`; fully independent |

### Phase 2 — System integrations (weeks 3-4)
| # | Extension | Why later |
|---|-----------|-----------|
| 4 | **Bitwarden** | Requires security layer review and `rbw`/`bw` setup |
| 5 | **n8n** | External service dependency, configuration UX |

### Phase 3 — Advanced features (weeks 5-6)
| # | Extension | Why last |
|---|-----------|---------|
| 6 | **Calendar** | Notification bridge, recurrence logic, potential CalDAV |

---

## Shared Infrastructure

Three capabilities are needed by multiple extensions and should be built once as SDK additions:

### 1. Encrypted storage
API keys (`com.nuxy.notes` Whisper key, `com.nuxy.n8n` API key, future OAuth tokens) must not be stored as plaintext. Electron `safeStorage` encrypts using OS keychain; it lives in the main process and needs an IPC bridge.

Proposed SDK addition:
```ts
core.storage.writeSecret(key: string, value: string): Promise<void>
core.storage.readSecret(key: string): Promise<string | null>
```

### 2. System notification bridge
`com.nuxy.calendar` needs `new Notification(title, { body })` from inside a Worker thread, which is not possible directly (Electron `Notification` only works in the main process).

Proposed SDK addition:
```ts
core.notification.send(title: string, body: string): Promise<void>
```
Implemented as an IPC call from the Worker to the main process.

### 3. Binary presence check
`com.nuxy.bitwarden` and `com.nuxy.video-downloader` depend on system binaries. Each extension's `register()` should check for the binary at startup and surface a clear error in the UI if it is missing — rather than failing silently on first use.

Pattern:
```js
import { execFile } from 'child_process'
function checkBinary(name) {
  return new Promise((resolve) => {
    execFile('which', [name], (err) => resolve(!err))
  })
}
```
