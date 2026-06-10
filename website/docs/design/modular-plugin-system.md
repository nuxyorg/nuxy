---
title: Modular Plugin System
---

# Modular Plugin System

Nuxy treats the executable as a **useless shell** until extensions populate `~/.nuxy/extensions/`. Every extension is loaded as a potentially hostile package and isolated accordingly.

## Loading sequence

```
App start
  → Scanner reads ~/.nuxy/extensions/*/manifest.json
  → For each extension with entry.backend:
       spawn Worker thread
       load @nuxy/extension-host bundle
       call register(CoreContext proxy)
       sync IPC channels to kernel registry
  → Renderer loads uikit extensions (window.UI)
  → Shell extension mounts (omnibar + tool host)
  → User activates tool → nuxy-ext:// loads frontend.ts
```

| Step              | Isolation guarantee                                 |
| ----------------- | --------------------------------------------------- |
| Worker spawn      | Separate V8 isolate — no shared memory              |
| CoreContext proxy | No direct `fs`, `electron`, or `child_process`      |
| Storage calls     | Chrooted to `~/.nuxy/data/<manifest.id>/`           |
| Frontend assets   | Served only from extension folder via `nuxy-ext://` |

## CoreContext proxy

The object passed to `register(core)` serializes every call as `host:call` / `host:reply` over `parentPort`:

```typescript
export interface CoreContext {
  registry: { registerTool; registerProvider; registerOrchestrator }
  ipc: { handle(channel, handler) }
  storage: { read; write }
  extensions: { invoke(targetId, channel, payload) } // gated by capabilities
  clipboard
  fs
  db
  shell
  media
  settings
  logger
  i18n
  config
}
```

See [API: CoreContext](/api/core-context) for the full surface.

## Cross-extension communication

Workers never call each other directly. The broker in the main process enforces manifest capabilities:

| Capability       | Effect                                                 |
| ---------------- | ------------------------------------------------------ |
| `callable: true` | Other extensions may `core.extensions.invoke` this one |
| `caller: true`   | This extension may invoke others                       |

**Example:** An orchestrator (`caller: true`) invokes the Notes tool (`callable: true`) to save text. The Calculator provider (`callable: false`) only answers omnibar queries — it cannot be invoked by other extensions.

## Built-in example: Calculator provider

```typescript
// extensions/calculator/backend.ts
export function register(core: CoreContext): void {
  core.registry.registerProvider({ name: 'Calculator' })
  core.ipc.handle('eval', async (payload: unknown) => {
    const expr = String(payload ?? '').trim()
    return evaluateMath(expr) // returns result or null
  })
}
```

The shell calls `eval` on every provider for each omnibar keystroke.

## Related

- [Extension System](/guide/extension-system) — types and lifecycle
- [Omni Input System](/design/omni-input-system) — provider vs tool vs orchestrator routing
- [Security](/design/security) — threat model and permission gates
