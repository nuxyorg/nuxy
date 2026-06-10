---
title: Omni Input System
---

# Omni Input System

The omnibar is the single input surface for the entire launcher. Nuxy routes keystrokes to the right extension type based on manifest `type` and user action.

## Three roles

| Type           | When it runs                   | Example                                        |
| -------------- | ------------------------------ | ---------------------------------------------- |
| `provider`     | Every omnibar keystroke (live) | Calculator evaluates `2 + 2` → `4`             |
| `tool`         | User activates from tool list  | Notes opens two-panel editor                   |
| `orchestrator` | Enter on unmatched raw text    | AI routes intent to callable tools _(planned)_ |

## Provider flow

```
User types "2 + 2"
  → Shell debounces (50ms)
  → core.ipc.invoke('com.nuxy.calculator', 'eval', '2 + 2')
  → Calculator Worker evaluates expression
  → Shell renders result in dropdown
```

Providers must handle the `eval` channel. They return result items the shell formats as list entries.

## Tool flow

```
User tabs to Notes (or selects from tool list)
  → Shell loads nuxy-ext://com.nuxy.notes/frontend.ts
  → <nuxy-tool-host> mounts nuxy-tool-notes
  → Shell sets toolElement.query on every keystroke
  → Controller filters/searches notes
```

Tools receive input via the `query` property — they must not render their own `<input>`.

## Orchestrator flow (planned)

When no dropdown result is selected and the user presses Enter, raw text falls through to the first registered orchestrator. The orchestrator parses intent and calls callable tools via `core.extensions.invoke`.

Orchestrators require `capabilities.caller: true`. Callable targets require `capabilities.callable: true`.

## Capabilities matrix

| Extension              | `callable` | `caller` | Can be invoked by others | Can invoke others |
| ---------------------- | ---------- | -------- | ------------------------ | ----------------- |
| Notes (tool)           | `true`     | `false`  | Yes                      | No                |
| Calculator (provider)  | `false`    | `false`  | No                       | No                |
| Future AI orchestrator | `false`    | `true`   | No                       | Yes               |

## Keyboard arbitration

When a tool is active:

- Omnibar input flows to the tool via `query`
- Tool-specific keys are handled by the tool (via `omniBar-keydown` when omnibar is hidden)
- `Escape` triggers configured window action (hide/minimize/quit)
- `Tab` cycles between tools

## Related

- [Extension Overview](/extensions/overview) — manifest `type` field
- [Lit Renderer](/design/lit-renderer) — how `query` reaches tool elements
- [IPC & Kernel](/guide/ipc-kernel) — `ext:invoke` routing
