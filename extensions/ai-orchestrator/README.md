# AI Orchestrator

> Routes natural-language queries to the right Nuxy extension using a local Ollama LLM.

**Type:** `orchestrator`
**Version:** 1.0.0
**ID:** `com.nuxy.ai-orchestrator`
**Permissions:** `network`

---

## Overview

AI Orchestrator intercepts every query typed into the Nuxy omnibar and decides which installed extension should handle it. It does this by sending the query to a locally running Ollama model (`functiongemma`) with a tool-calling prompt, then invoking the selected extension via `core.extensions.invoke` and returning a final human-readable answer. The result is broadcast back to the UI via the `orchestrator-result` channel.

Users get a single natural-language entry point for actions like math calculations, time-zone conversions, calendar reminders, and open-ended AI conversation — without needing to manually switch between tools.

---

## Extension Type

### `orchestrator`
Coordinates multiple other extensions. Calls other extension backends via `core.extensions.invoke` and aggregates or routes their results.

---

## How It Works

1. The orchestrator registers itself with `core.registry.registerOrchestrator`.
2. When a query arrives, it discovers all callable extensions via `registry.getCallableTools()`.
3. It builds an Ollama tool-calling request from their JSON schemas (falling back to built-in schemas for well-known extensions).
4. The `functiongemma` model returns a tool call with structured arguments.
5. The matching extension is invoked on its designated IPC channel; the result is fed back to Ollama for a natural summary.
6. The final answer is broadcast on `orchestrator-result`.

Built-in extension mappings:

| Extension ID | IPC channel | Description |
|---|---|---|
| `com.nuxy.time-calculator` | `convert` | Timezone conversion |
| `com.nuxy.calculator` | `eval` | Math expression evaluation |
| `com.nuxy.calendar` | `prepare` | Reminder / event creation |
| `com.nuxy.ollama` | `query` | General-purpose conversation |

---

## Cross-Extension Integration

### This extension calls other extensions

Requires `capabilities.caller: true` in the manifest. The orchestrator dynamically discovers all extensions that expose `capabilities.callable: true` and calls them at runtime. Currently has built-in support for:

- `com.nuxy.time-calculator` → channel `convert`
- `com.nuxy.calculator` → channel `eval`
- `com.nuxy.calendar` → channel `prepare`
- `com.nuxy.ollama` → channel `query`

Any callable extension with a JSON schema is automatically picked up without code changes.

---

## IPC Channels

| Channel | Payload | Returns | Description |
|---------|---------|---------|-------------|
| `route` | `{ text: string }` | `{ ok: boolean, data: { toolCalled?: string, initialQuery?: string } }` | Manually trigger orchestration for a given query string |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `network` | HTTP calls to the local Ollama API at `http://localhost:11434` |

---

## Localization

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `tr` | Turkish |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

**Desktop environments:** Works on any DE. Requires Ollama to be running locally.

---

## Requirements

| Requirement | Minimum version | Install |
|-------------|-----------------|---------|
| Ollama | 0.1.x | [ollama.ai](https://ollama.ai) |
| `functiongemma` model | latest | `ollama pull functiongemma` |

The extension connects to Ollama at `http://localhost:11434` by default. Ollama must be running and the `functiongemma` model must be pulled before use.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.ai-orchestrator",
  "name": "AI Orchestrator",
  "version": "1.0.0",
  "type": "orchestrator",
  "icon": "ai",
  "orchestratorType": "tool_caller",
  "permissions": ["network"],
  "capabilities": {
    "callable": false,
    "caller": true
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  },
  "entry": {
    "backend": "backend.ts"
  }
}
```
