---
name: write-extension
description: >
  Writing, reviewing, or modifying any Nuxy extension.
  Trigger on: new extension folder, manifest.json, backend.ts, frontend.ts,
  nuxy-tool-*.ts, LitElement custom element, CoreContext usage, IPC channels,
  extension permissions, or any file under extensions/<name>/.
---

# Nuxy Extension Writing Skill

Before writing or reviewing any Nuxy extension, read the following documents in order:

1. **[`extensions/EXTENSION_GUIDE.md`](../../extensions/EXTENSION_GUIDE.md)** — Full mandatory ruleset. The authoritative reference for extension architecture, types, backend API, frontend patterns, manifest fields, and IPC.

2. **[`extensions/MANIFEST_GUIDE.md`](../../extensions/MANIFEST_GUIDE.md)** — All `manifest.json` fields, extension types, permission policy, and localisation config.

3. **[`extensions/FRONTEND_STRUCTURE_GUIDE.md`](../../extensions/FRONTEND_STRUCTURE_GUIDE.md)** — When and how to split the custom element from its controller. Controller pattern, anti-patterns, decision guide.

4. **[`extensions/LIT_MIGRATION_GUIDE.md`](../../extensions/LIT_MIGRATION_GUIDE.md)** — Converting vanilla HTMLElement + h() to LitElement. Template syntax reference, anti-patterns checklist.

## Quick Rules (memorise these)

### Structure

- **Every extension** needs: `manifest.json` + at least one of `backend.ts` / `frontend.ts`
- **`frontend.ts`** is the bootstrap file — see three shapes below
- **Pure entry** (tool): `import './nuxy-tool-<name>.ts'` — only registers the element
- **Viewmodel** (helper/theme): `import { XViewModel } from './x-viewmodel.ts'; new XViewModel().mount()` — lifecycle logic in the viewmodel class, renderer in a separate element or none
- **Custom element** file: `nuxy-tool-<name>.ts` implementing `NuxyToolElement` from `@nuxy/core`
- **Controller** class: owns state, IPC calls, business logic — custom element delegates to it

### Manifest

- `id`: reverse-DNS, e.g. `com.nuxy.my-extension`
- `type`: `tool` | `provider` | `orchestrator` | `helper` | `theme` | `iconpack` | `uikit`
- `entry.element`: must match the registered custom element tag name
- Declare every `core.*` API you use in `permissions`

### Frontend (LitElement — mandatory for new code)

```typescript
import { LitElement, html, nothing, customElement } from '@nuxy/core'
// NOT from 'lit' — always from '@nuxy/core'

@customElement('nuxy-tool-my-extension')
export class NuxyToolMyExtensionElement extends LitElement implements NuxyToolElement {
  protected createRenderRoot(): HTMLElement {
    return this
  } // MANDATORY — light DOM
  // ...
}
```

### Backend

```typescript
import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ ... })
  core.ipc.handle('my-channel', async (payload) => { ... })
}
```

### Shared Utilities

| Import             | Source                                     |
| ------------------ | ------------------------------------------ |
| `TwoPanelNav`      | `../ui-default/src/hooks/two-panel-nav.ts` |
| `createStore`      | `../store.ts`                              |
| `createTranslator` | `../shell-i18n.ts`                         |

### Forbidden

- ❌ `import { ... } from 'lit'` — use `@nuxy/core`
- ❌ `import { h } from '../ce-utils.ts'` — `ce-utils.ts` is deleted
- ❌ `import fs from 'fs'` — use `core.fs.*`
- ❌ `import child_process` — use `core.shell.*`
- ❌ Shadow DOM (omitting `createRenderRoot()`)
- ❌ `static styles = css\`...\`` in light DOM elements
- ❌ IPC calls inside `render()`
- ❌ Direct `replaceChildren()` / `appendChild()` in Lit elements

### TDD

Write tests before implementation. Tests live next to the code:

- Extension logic → `extensions/<name>/*.test.ts`
- Mock `CoreContext` inline (see existing `*.test.ts` for the pattern)
