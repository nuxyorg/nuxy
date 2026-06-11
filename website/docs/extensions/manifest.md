---
title: Manifest Reference
---

# Manifest Reference

Every extension must have a `manifest.json` file at its root. This file is the single source of truth for the extension's identity, type, permissions, and entry points.

## Top-Level Fields

| Field          | Type       | Required | Description                                                                                                               |
| -------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`   | Yes      | Unique reverse-DNS identifier. Convention: `com.<domain>.<name>`. Must be globally unique.                                |
| `name`         | `string`   | Yes      | Human-readable display name shown in the launcher tool list.                                                              |
| `version`      | `string`   | Yes      | Semantic version string (e.g. `"1.0.0"`).                                                                                 |
| `type`         | `string`   | Yes      | Extension type. See [Extension Types](#extension-types) below.                                                            |
| `icon`         | `string`   | No       | Name of the Lucide icon representing the tool in the tool list.                                                           |
| `bootstrap`    | `boolean`  | No       | If `true`, this extension's frontend is loaded at app startup and excluded from `listTools`. Used by the shell extension. |
| `placeholder`  | `string`   | No       | Custom placeholder text for the omnibar when this tool is active. Falls back to `"Search <name>"` if omitted.             |
| `permissions`  | `string[]` | No       | Host APIs the extension needs access to. See [Permissions](#permissions).                                                 |
| `capabilities` | `object`   | No       | Cross-extension invocation rights. See [Capabilities](#capabilities).                                                     |
| `priority`     | `number`   | No       | Load order for `uikit` extensions. Lower loads first (default: `100`).                                                    |
| `queryAffinity`| `string[]` | No       | Query types this provider or tool handles best. Boosts results/actions when input matches. See [Query Affinity](#query-affinity). |
| `locales`      | `object`   | No       | Internationalisation config. See [Locales](#locales).                                                                     |
| `behavior`     | `object`   | No       | Tool lifecycle behavior (e.g. `onComplete`).                                                              |
| `composition`  | `object`   | No       | UI composition slots this extension may provide or claim.                                                 |
| `entry`        | `object`   | Yes      | Relative paths to entry files. See [Entry Points](#entry-points).                                                         |

## Extension Types

| Value          | User visible | Backend worker | Frontend          | Role                                                |
| -------------- | ------------ | -------------- | ----------------- | --------------------------------------------------- |
| `tool`         | Yes          | Required       | Optional          | Interactive feature activated by the user           |
| `provider`     | Yes          | Required       | Optional          | Real-time omnibar result provider                   |
| `orchestrator` | Yes          | Required       | Optional          | Fallback handler for unmatched Enter (typically AI) |
| `helper`       | No           | Optional       | Optional          | Background utility called by other extensions       |
| `uikit`        | No           | No             | Yes, loaded early | Extends `window.UI` with new UI components          |
| `theme`        | No           | No             | No                | JSON CSS variable theme definition                  |
| `iconpack`     | No           | No             | No                | JSON SVG icon pack                                  |

::: warning Helper vs Tool
A `helper` extension must **not** call `core.registry.registerTool`. Helpers are invisible to users and only exist to serve other extensions. If you want users to activate your extension, use `type: "tool"`.
:::

## Permissions

Declare every `core.*` API you use. Undeclared calls are rejected at runtime with `PERMISSION_DENIED`.

| Value            | Gates access to                                                    |
| ---------------- | ------------------------------------------------------------------ |
| `storage`        | `core.storage.*` — sandboxed JSON files under `~/.nuxy/data/<id>/` |
| `clipboard`      | `core.clipboard.*` — OS clipboard read/write/image                 |
| `media`          | `core.media.*` — now-playing metadata                              |
| `network`        | Outbound HTTP/fetch requests                                       |
| `notifications`  | System desktop notifications                                       |
| `fs`             | `core.fs.*` — general filesystem operations                        |
| `db`             | `core.db.*` — SQLite database access                               |
| `shell`          | `core.shell.*` — run external binaries or open URLs                |
| `settings.read`  | Read another extension's `ext-settings.json`                       |
| `settings.write` | Write another extension's `ext-settings.json`                      |

Example:

```json
{
  "permissions": ["storage", "clipboard", "network"]
}
```

## Capabilities

Controls cross-extension invocation rights:

| Field      | Type      | Default | Description                                                           |
| ---------- | --------- | ------- | --------------------------------------------------------------------- |
| `callable` | `boolean` | `false` | Other extensions may invoke this one via `core.extensions.invoke`     |
| `caller`   | `boolean` | `false` | This extension may call other extensions via `core.extensions.invoke` |

```json
{
  "capabilities": {
    "callable": true,
    "caller": false
  }
}
```

::: tip Orchestrators
AI orchestrators must declare `"caller": true` to get access to `core.extensions.invoke`. Standard tools should declare `"callable": true` to be invokable by orchestrators, and `"caller": false` to prevent them from making cross-extension calls.
:::

## Entry Points

The `entry` object maps entry point names to relative file paths within the extension folder.

| Field            | Required for types                           | Description                                                                                    |
| ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `entry.backend`  | `tool`, `provider`, `orchestrator`, `helper` | Backend TypeScript module — must export `register(core: CoreContext)`                          |
| `entry.frontend` | Optional for all                             | Frontend TypeScript file that registers the extension's custom element                         |
| `entry.element`  | Optional                                     | Custom element tag for tool UI, e.g. "nuxy-tool-clipboard"                                     |
| `entry.preload`  | Optional                                     | Runs in the Electron preload context at startup (clipboard watchers, early setup)              |
| `entry.settings` | Optional                                     | Path to `settings.json` — declares user-configurable fields rendered by the Settings extension |
| `entry.theme`    | `theme`                                      | Path to `theme.json` — CSS custom property value map                                           |
| `entry.icons`    | `iconpack`                                   | Path to `icons.json` — `{ version, name, icons: { [name]: svgString } }`                       |

```json
{
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts",
    "element": "nuxy-tool-clipboard",
    "preload": "preload.ts",
    "settings": "settings.json"
  }
}
```

## Locales

Enable internationalisation by declaring a `locales` block:

| Field       | Type       | Required | Description                                                        |
| ----------- | ---------- | -------- | ------------------------------------------------------------------ |
| `default`   | `string`   | Yes      | BCP 47 code of the extension's built-in language (e.g. `"en"`)     |
| `supported` | `string[]` | Yes      | All BCP 47 codes the extension ships translations for              |
| `dir`       | `string`   | No       | Subdirectory containing locale JSON files. Defaults to `"locales"` |

```json
{
  "locales": {
    "default": "en",
    "supported": ["en", "tr", "ja", "ar"]
  }
}
```

Each entry in `supported` must have a corresponding file at `locales/<code>.json`.

## Settings Schema (`settings.json`)

When `entry.settings` is declared, the Settings extension reads the schema and renders a UI automatically. Available field types:

| Type       | Description                                    |
| ---------- | ---------------------------------------------- |
| `text`     | Free-text string input                         |
| `select`   | Dropdown from a static `options` list          |
| `toggle`   | Boolean on/off switch                          |
| `location` | Folder picker (resolves `~` to home directory) |
| `color`    | Color picker                                   |
| `list`     | Multi-value string list                        |

```json
{
  "version": 1,
  "fields": [
    {
      "key": "serverUrl",
      "label": "Server URL",
      "type": "text",
      "default": "http://localhost:11434",
      "placeholder": "http://localhost:11434",
      "description": "Ollama server endpoint"
    },
    {
      "key": "model",
      "label": "Model",
      "type": "select",
      "default": "llama3",
      "options": [
        { "value": "llama3", "label": "Llama 3" },
        { "value": "mistral", "label": "Mistral" }
      ]
    },
    {
      "key": "streamOutput",
      "label": "Stream Output",
      "type": "toggle",
      "default": true
    }
  ]
}
```

## Complete Example

```json
{
  "id": "com.example.my-tool",
  "name": "My Tool",
  "version": "1.0.0",
  "type": "tool",
  "icon": "wrench",
  "placeholder": "Search my tool...",
  "permissions": ["storage", "clipboard"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts",
    "element": "nuxy-tool-my-tool",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```

## Query Affinity

Declare which omnibar input types your provider or tool handles best. The shell uses this information to boost your extension's results and actions when the detected `QueryContext` matches.

| Field          | Type         | Required | Description                                                      |
| -------------- | ------------ | -------- | ---------------------------------------------------------------- |
| `queryAffinity`| `QueryType[]`| No       | One or more query types. Has no effect on `uikit`/`theme`/`iconpack` extensions. |

Valid `QueryType` values: `"text"`, `"url"`, `"color"`, `"math"`, `"path"`, `"email"`, `"image"`, `"video"`, `"audio"`, `"pdf"`, `"archive"`.

```json
{
  "id": "com.example.color-picker",
  "type": "provider",
  "queryAffinity": ["color"]
}
```

```json
{
  "id": "com.example.downloader",
  "type": "tool",
  "queryAffinity": ["video", "audio", "url"]
}
```

At runtime, tool actions can further declare `relevantFor` per-action for fine-grained boosting. See [Query Context → Tool actions](/api/query-context#tool-actions--relevantfor).

## Next steps

- [Your First Extension](/extensions/first-extension) — walkthrough using these fields
- [Access & Permissions](/extensions/extension-access) — what each permission gates
- [Development Guide](/extensions/development-guide) — full authoring ruleset
