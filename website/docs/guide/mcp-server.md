---
title: MCP Server
---

# MCP Server

::: warning Beta
The Nuxy MCP server is planned for the beta release. This page documents the intended behavior; the server is not yet available.
:::

The **Nuxy MCP server** (`packages/mcp-server`) exposes extension development tools over the [Model Context Protocol](https://modelcontextprotocol.io), making AI assistants (Claude, Cursor, Copilot, etc.) first-class participants in the extension authoring workflow.

With the MCP server running, an AI assistant can scaffold a new extension, validate its manifest, lint the source, read the full development guide, and query the CoreContext API — all without leaving the conversation.

## Installation

The server ships as part of the Nuxy monorepo and runs over stdio.

**Claude Code / Claude Desktop — add to your MCP config:**

```json
{
  "mcpServers": {
    "nuxy": {
      "command": "node",
      "args": ["/path/to/nuxy/packages/mcp-server/dist/index.js"],
      "env": {
        "NUXY_ROOT": "/path/to/nuxy"
      }
    }
  }
}
```

**Cursor — `.cursor/mcp.json`:**

```json
{
  "nuxy": {
    "command": "node",
    "args": ["packages/mcp-server/dist/index.js"]
  }
}
```

Build the server before use:

```bash
pnpm -C packages/mcp-server build
```

## Available Tools

### `nuxy_create_extension`

Scaffold a new extension with the standard file structure.

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `name` | string | Extension folder name (e.g. `my-tool`) |
| `type` | string | `tool` \| `provider` \| `orchestrator` |
| `id` | string | Optional. Reverse-DNS ID. Defaults to `com.nuxy.<name>` |

**Output:** List of created files and their paths.

---

### `nuxy_lint_extension`

Run the extension linter and return structured results.

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `path` | string | Absolute path to the extension folder |

**Output:** JSON lint report — score, violations list, lit-analyzer results. Same format as `pnpm lint-ext --json`.

---

### `nuxy_validate_manifest`

Validate a `manifest.json` object against the Nuxy manifest schema without running the full linter.

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `manifest` | object | The parsed manifest content |

**Output:** `{ valid: boolean, errors: string[] }`

---

### `nuxy_get_extension_guide`

Return the full content of `rules/EXTENSION_GUIDE.md` — the canonical ruleset for extension development.

**Input:** none

**Output:** Markdown string.

---

### `nuxy_get_api_reference`

Return structured documentation for the `CoreContext` API.

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `section` | string | Optional. Filter to a specific section: `ipc`, `storage`, `clipboard`, `fs`, `db`, `shell`, `registry`, `i18n`, `events`, `media`, `config`, `extensions` |

**Output:** Markdown string for the requested section (or the full reference if omitted).

---

### `nuxy_list_extensions`

List all extensions in the monorepo (or a specified directory).

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `dir` | string | Optional. Directory to scan. Defaults to `extensions/` in `NUXY_ROOT` |

**Output:** Array of `{ id, name, version, type, path }` objects.

---

### `nuxy_get_manifest_schema`

Return the JSON Schema for `manifest.json`.

**Input:** none

**Output:** JSON Schema object.

---

### `nuxy_get_ipc_channels`

Return the IPC channels registered by a specific extension's backend, by statically analyzing `backend.ts`.

**Input:**

| Parameter | Type | Description |
|---|---|---|
| `path` | string | Absolute path to the extension folder |

**Output:** Array of channel names found in `core.ipc.handle(...)` calls.

## Example Workflow

Below is a typical AI-assisted session using the MCP server.

```
User: Create a new "bookmarks" extension that saves URLs with a title
```

The AI calls `nuxy_get_extension_guide` to read the rules, then `nuxy_create_extension({ name: "bookmarks", type: "tool" })` to scaffold the folder. It writes `backend.ts` and `frontend.ts`, then calls `nuxy_lint_extension` to verify the score before presenting the result.

## Skills (Claude Code)

When the MCP server is active, a set of Claude Code skills wraps the raw tools into higher-level workflows:

| Skill | Trigger | What it does |
|---|---|---|
| `/nuxy new <name>` | `nuxy new bookmarks` | Scaffold + open in editor |
| `/nuxy lint [name]` | `nuxy lint clipboard` | Run linter, show violations inline |
| `/nuxy guide` | `nuxy guide` | Load extension guide into context |
| `/nuxy api [section]` | `nuxy api storage` | Load CoreContext API docs for a section |
| `/nuxy pack <name>` | `nuxy pack clipboard` | Package extension for distribution |

Skills are installed automatically when the MCP server is configured.

## Environment Variables

| Variable | Description |
|---|---|
| `NUXY_ROOT` | Path to the Nuxy monorepo root. Required. |
| `NUXY_EXTENSIONS_DIR` | Path to scan for extensions. Defaults to `$NUXY_ROOT/extensions`. |
| `NUXY_LOG_LEVEL` | `silent` \| `info` \| `debug`. Defaults to `silent`. |