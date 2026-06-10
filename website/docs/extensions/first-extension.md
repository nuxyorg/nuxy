---
title: Your First Extension
---

# Your First Extension

This guide builds a complete "Hello World" tool extension using **LitElement**. By the end you will have a working extension with a backend, a Lit frontend, and a test suite.

## Prerequisites

- Nuxy installed and running (`pnpm dev`)
- Basic TypeScript knowledge

## Step 1: Create the Extension Folder

Extensions live in `~/.nuxy/extensions/`. Create a folder named after your extension's ID:

```bash
mkdir -p ~/.nuxy/extensions/com.example.hello-world
cd ~/.nuxy/extensions/com.example.hello-world
```

::: tip Working in the monorepo
If you are building a first-party extension for the Nuxy repo itself, create it under `extensions/hello-world/` — the dev server will auto-sync it to `~/.nuxy/extensions/`.
:::

## Step 2: Write `manifest.json`

```json
{
  "id": "com.example.hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "type": "tool",
  "icon": "hand",
  "permissions": ["storage"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts",
    "element": "nuxy-tool-hello-world"
  },
  "locales": {
    "default": "en",
    "supported": ["en"]
  }
}
```

Key fields:

- `id` — unique reverse-DNS identifier; use your own domain, not `com.nuxy`
- `type: "tool"` — appears in the tool list
- `entry.element` — custom element tag the shell mounts
- `permissions: ["storage"]` — needed to save greeting history

## Step 3: Write `types.ts`

```typescript
// types.ts
import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface Greeting {
  id: string
  name: string
  message: string
  createdAt: string
}

export interface IpcChannels extends IpcChannelMap {
  greet: { input: { name: string }; output: Greeting }
  getHistory: { input: void; output: Greeting[] }
}
```

## Step 4: Write `backend.ts`

```typescript
// backend.ts
import type { CoreContext } from '@nuxy/extension-sdk'
import type { Greeting, IpcChannels } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'Hello World' })

  core.ipc.handle('greet', async (payload: unknown): Promise<Greeting> => {
    const { name } = payload as IpcChannels['greet']['input']

    const greeting: Greeting = {
      id: crypto.randomUUID(),
      name,
      message: core.i18n.t('greeting', { name }),
      createdAt: new Date().toISOString(),
    }

    const history = (await core.storage.read<Greeting[]>('history.json')) ?? []
    history.unshift(greeting)
    await core.storage.write('history.json', history.slice(0, 50))

    core.logger.info('Greeted user', { name })
    return greeting
  })

  core.ipc.handle('getHistory', async (): Promise<Greeting[]> => {
    return (await core.storage.read<Greeting[]>('history.json')) ?? []
  })
}
```

::: warning No Node.js imports
Never import `fs`, `path`, `os`, or any Node built-in directly. Use `core.storage`, `core.fs`, `core.logger`, etc.
:::

## Step 5: Write `tests/backend.test.ts`

```typescript
// tests/backend.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from '../backend.ts'
import type { Greeting } from '../types.ts'

describe('hello-world backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
    register(core)
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hello World' })
    )
  })

  it('greet returns a greeting and saves to storage', async () => {
    const result = (await handlers['greet']({ name: 'World' })) as Greeting
    expect(result.name).toBe('World')
    expect(core.storage.write).toHaveBeenCalled()
  })

  it('getHistory returns empty array on first run', async () => {
    const result = await handlers['getHistory']()
    expect(Array.isArray(result)).toBe(true)
  })
})
```

Run the tests:

```bash
pnpm -C src test -- extensions/hello-world/tests/backend.test.ts
```

## Step 6: Write `frontend.ts`

`frontend.ts` is the bootstrap file — it only registers the custom element:

```typescript
// frontend.ts
import './nuxy-tool-hello-world.ts'
```

## Step 7: Write `nuxy-tool-hello-world.ts`

The tool element uses `LitElement` from `@nuxy/core` with **light DOM** so theme tokens apply:

```typescript
// nuxy-tool-hello-world.ts
import { LitElement, html, css, nothing, customElement, property, state } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import type { Greeting, IpcChannels } from './types.ts'

const EXT_ID = 'com.example.hello-world'

async function invoke<C extends keyof IpcChannels>(
  channel: C,
  payload?: IpcChannels[C]['input']
): Promise<IpcChannels[C]['output']> {
  const res = await window.core.ipc.invoke(EXT_ID, channel, payload)
  if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
  return res.data
}

@customElement('nuxy-tool-hello-world')
export class NuxyToolHelloWorldElement extends LitElement implements NuxyToolElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  `

  @property({ type: String }) committedQuery = ''
  @property({ type: String }) extensionId = EXT_ID

  @state() private history: Greeting[] = []
  @state() private loading = true

  private _query = ''

  protected createRenderRoot(): HTMLElement {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    void this.loadHistory()
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    if (next.trim()) void this.greet(next.trim())
  }
  get query(): string {
    return this._query
  }

  private async loadHistory(): Promise<void> {
    this.loading = true
    this.history = await invoke('getHistory').catch(() => [])
    this.loading = false
  }

  private async greet(name: string): Promise<void> {
    const greeting = await invoke('greet', { name }).catch(() => null)
    if (greeting) {
      this.history = [greeting, ...this.history].slice(0, 50)
    }
  }

  render() {
    const { List, ListItem, ListItemText, ListItemMeta, EmptyState, LoadingState } =
      (window as any).UI || {}

    if (this.loading && LoadingState) {
      return html`${LoadingState({})}`
    }

    if (this.history.length === 0 && EmptyState) {
      return html`${EmptyState({
        title: 'No greetings yet',
        description: 'Type a name in the search bar to greet someone.',
      })}`
    }

    if (!List || !ListItem) return nothing

    const items = this.history.map(
      (g) =>
        html`${ListItem({
          children: [
            ListItemText({ primary: g.message }),
            ListItemMeta({ children: new Date(g.createdAt).toLocaleDateString() }),
          ],
        })}`
    )

    return html`${List({ children: items })}`
  }
}
```

::: tip Light DOM is mandatory
Always override `createRenderRoot()` to return `this`. Shadow DOM blocks CSS custom properties from the active theme.
:::

::: tip Import from @nuxy/core
Never import from `lit` directly. Lit is re-exported from `@nuxy/core` for consistent workspace resolution.
:::

## Step 8: Install and Test

If you created the extension in `~/.nuxy/extensions/`, restart Nuxy:

```bash
echo "toggle" | nc -U /tmp/nuxy.sock
```

If you created it in the repo's `extensions/` directory, `pnpm dev` will auto-sync it.

Open the launcher and look for "Hello World" in the tool list. Type a name in the omnibar to greet someone.

## Complete File Checklist

```
com.example.hello-world/
  manifest.json              ✓ required
  types.ts                   ✓ data models + IPC channel map
  backend.ts                 ✓ register() function
  tests/
    backend.test.ts          ✓ test coverage for all handlers
  frontend.ts                ✓ bootstrap — imports custom element
  nuxy-tool-hello-world.ts   ✓ LitElement implementing NuxyToolElement
```

## Next Steps

- [Manifest Reference](/extensions/manifest) — full manifest.json field documentation
- [Frontend Structure](/extensions/frontend-structure) — controllers, light DOM, viewmodel pattern
- [Testing Extensions](/extensions/testing) — full testing patterns
- [Extension Development Guide](/extensions/development-guide) — complete authoring ruleset
