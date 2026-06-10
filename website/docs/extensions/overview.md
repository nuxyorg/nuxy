---
title: Extension System Overview
---

# Extension System Overview

Nuxy's entire feature set is delivered through extensions. The launcher core is intentionally minimal — it provides a window, a kernel, and an IPC bridge. Everything else is an extension.

## Extension Types

### Tools

Tools are the primary user-facing extension type. A tool appears in the launcher's tool list and, when activated, its frontend component takes over the window content area.

**Examples:** Notes, Settings, Nyaa

```json
{ "type": "tool", "capabilities": { "callable": true, "caller": false } }
```

### Providers

Providers react to omnibar keystrokes in real time. Every active provider receives the current query and returns a list of result items. Results from all providers are merged and displayed together in the launcher.

**Examples:** Calculator (evaluates math expressions inline)

```json
{ "type": "provider", "capabilities": { "callable": false, "caller": false } }
```

### Orchestrators

Orchestrators are the fallback handler. When the user presses Enter without selecting a specific result, the input goes to the orchestrator. An orchestrator typically uses an LLM or AI layer to parse the user's intent and route to the appropriate tool.

**Examples:** AI Orchestrator (Ollama-backed tool caller)

```json
{ "type": "orchestrator", "capabilities": { "callable": false, "caller": true } }
```

### Helpers

Helpers run in the background and are never shown to users. They provide utility services that other extensions call via `core.extensions.invoke`. A helper may also attach side-effects to the shell DOM from its frontend.

**Examples:** Cursor trail, ambient sound, status clock (visual overlays)

```json
{ "type": "helper", "capabilities": { "callable": true, "caller": false } }
```

### UIKit Extensions

UIKit extensions load before the shell and inject additional custom element factories into `window.UI`. Any extension can then use these components via `window.UI.MyNewComponent`.

```json
{ "type": "uikit", "priority": 10 }
```

### Theme Extensions

Theme extensions ship a JSON file containing CSS custom property values. Once installed, the theme becomes available in the Settings → Theme picker.

```json
{ "type": "theme", "entry": { "theme": "theme.json" } }
```

**Default themes:** `dark` and `light` ship with the kernel. Additional themes install as `theme` extensions (e.g. `com.nuxy.theme-sakura`).

### Icon Pack Extensions

Icon pack extensions ship an `icons.json` file with SVG strings keyed by name. The renderer accesses icons via `window.core.icons.get(name, pack?)`.

```json
{ "type": "iconpack", "entry": { "icons": "icons.json" } }
```

## Where Extensions Live

- **Built-in extensions:** `extensions/` in the repo root (auto-synced to `~/.nuxy/extensions/` during `pnpm dev`)
- **User-installed extensions:** `~/.nuxy/extensions/<id>/` — create the folder, add `manifest.json` and source files, restart Nuxy

## Built-in Extensions

See the full list with reference implementations: [Built-in Extensions](/extensions/built-in).

| Extension     | Type               | ID                       |
| ------------- | ------------------ | ------------------------ |
| Shell         | `tool` (bootstrap) | `com.nuxy.shell`         |
| Settings      | `tool`             | `com.nuxy.settings`      |
| Notes         | `tool`             | `com.nuxy.notes`         |
| Nyaa          | `tool`             | `com.nuxy.nyaa`          |
| Calculator    | `provider`         | `com.nuxy.calculator`    |
| Gradient      | `helper`           | `com.nuxy.gradient`      |
| UI Default    | `uikit`            | `com.nuxy.ui-default`    |
| Icons Default | `iconpack`         | `com.nuxy.icons-default` |
| Theme Sakura  | `theme`            | `com.nuxy.theme-sakura`  |

## Next Steps

- [Your First Extension](/extensions/first-extension) — step-by-step Lit extension guide
- [Manifest Reference](/extensions/manifest) — every manifest.json field documented
- [Frontend Structure](/extensions/frontend-structure) — LitElement patterns, controllers, and light DOM
- [Extension Development Guide](/extensions/development-guide) — complete authoring ruleset
