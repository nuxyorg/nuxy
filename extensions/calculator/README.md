# Calculator

> Evaluates arithmetic expressions inline as you type in the omnibar.

**Type:** `provider`
**Version:** 1.0.0
**ID:** `com.nuxy.calculator`
**Permissions:** None

---

## Overview

Calculator is a `provider`-type extension that runs silently in the background. Whenever the omnibar contains a valid arithmetic expression, the result appears immediately below the query without navigating away from the shell. Evaluation is performed with a custom safe parser — no `eval` is used — so there is no risk of code injection. The extension is also callable by other extensions such as AI Orchestrator, which routes math queries to it automatically.

---

## Extension Type

### `provider`

Runs inline inside the shell — provides a result or suggestion without the user navigating away. The calculator shows the computed result directly under the query as the user types.

---

## Usage

### Activation

Calculator is always active. Simply type a math expression into the omnibar from any context — the result appears immediately.

Supported operators: `+`, `-`, `*`, `/`, parentheses `( )`, and decimal numbers.

### Examples

**Example 1 — Basic arithmetic:**
Type `42 * 7` → `= 294` appears below the query.

**Example 2 — Division with parentheses:**
Type `(100 + 50) / 3` → `= 50` appears instantly.

**Example 3 — Used via AI Orchestrator:**
Type `what is 2 to the power of 8` in natural language — the AI Orchestrator routes the math to the Calculator's `eval` channel and returns `= 256`.

---

## Permissions

None required.

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

## Cross-Extension Integration

### This extension can be called by other extensions

`capabilities.callable: true` — other extensions can invoke the calculator directly:

```ts
const result = await core.extensions.invoke('com.nuxy.calculator', 'eval', { text: '2 + 2' })
```

**Exposed IPC channels:**

| Channel | Payload            | Returns                                                                            | Description                                                                                                  |
| ------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `eval`  | `{ text: string }` | `{ items: Array<{ id: string, title: string, subtitle: string, value: number }> }` | Evaluate an arithmetic expression; returns an empty `items` array if the expression is invalid or incomplete |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.calculator",
  "name": "Calculator",
  "version": "1.0.0",
  "type": "provider",
  "icon": "calculator",
  "providerType": "result",
  "permissions": [],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```
