---
title: Your First Extension
---

# Your First Extension

This guide builds a complete "Hello World" tool extension from scratch. By the end you will have a working extension with a backend, a frontend, and a test suite.

## Prerequisites

- Nuxy installed and running (`pnpm dev`)
- Basic TypeScript and React knowledge

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

Every extension starts with `manifest.json`. This file defines the extension's identity, type, permissions, and entry points.

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
    "frontend": "frontend.tsx"
  },
  "locales": {
    "default": "en",
    "supported": ["en"]
  }
}
```

Key fields:
- `id` — unique reverse-DNS identifier; use your own domain, not `com.nuxy`
- `type: "tool"` — this extension will appear in the tool list
- `permissions: ["storage"]` — we will save greetings to storage
- `capabilities.callable: true` — other extensions (e.g. an orchestrator) can call us

## Step 3: Write `types.ts`

Define your data models and IPC contract in a dedicated `types.ts` file:

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
  greet:      { input: { name: string }; output: Greeting  }
  getHistory: { input: void;             output: Greeting[] }
}
```

## Step 4: Write `backend.ts`

The backend runs in an isolated Worker thread. It receives a `CoreContext` proxy and registers IPC handlers:

```typescript
// backend.ts
import type { CoreContext } from '@nuxy/extension-sdk'
import type { Greeting, IpcChannels } from './types.ts'

export function register(core: CoreContext): void {
  // Register this extension as a tool in the kernel
  core.registry.registerTool({ name: 'Hello World' })

  // IPC handler: greet a user and save to history
  core.ipc.handle('greet', async (payload: unknown): Promise<Greeting> => {
    const { name } = payload as IpcChannels['greet']['input']

    const greeting: Greeting = {
      id: crypto.randomUUID(),
      name,
      message: core.i18n.t('greeting', { name }),
      createdAt: new Date().toISOString(),
    }

    // Read existing history and prepend new greeting
    const history = (await core.storage.read<Greeting[]>('history.json')) ?? []
    history.unshift(greeting)
    await core.storage.write<Greeting[]>('history.json', history.slice(0, 50))

    core.logger.info('Greeted user', { name })
    return greeting
  })

  // IPC handler: return stored greeting history
  core.ipc.handle('getHistory', async (): Promise<Greeting[]> => {
    return (await core.storage.read<Greeting[]>('history.json')) ?? []
  })
}
```

::: warning No Node.js imports
Never import `fs`, `path`, `os`, or any Node built-in directly. Use `core.storage`, `core.fs`, `core.logger`, etc. Direct imports will cause a runtime error.
:::

## Step 5: Write `backend.test.ts`

Tests are mandatory for every extension with a backend. Use `createMockCore` from `@nuxy/extension-sdk`:

```typescript
// backend.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { Greeting } from './types.ts'

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
    const result = await handlers['greet']({ name: 'World' }) as Greeting
    expect(result.name).toBe('World')
    expect(result.message).toContain('World')
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
pnpm -C src test -- extensions/hello-world/backend.test.ts
```

## Step 6: Write `frontend.tsx`

The frontend is a React component loaded via `nuxy-ext://` when the user activates the tool. All UI must use components from `window.UI`. Do not import React — use `window.React`.

```tsx
// frontend.tsx
const React = window.React
const { useState, useEffect } = React

import type { TypedInvoker } from '@nuxy/extension-sdk'
import type { Greeting, IpcChannels } from './types.ts'

const EXT_ID = 'com.example.hello-world'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {} }))

interface Props {
  query: string
}

export default function HelloWorldView({ query }: Props) {
  const { List, ListItem, ListItemText, ListItemMeta, EmptyState } = window.UI || {}
  const [history, setHistory] = useState<Greeting[]>([])
  const [lastGreeting, setLastGreeting] = useState<Greeting | null>(null)

  // Typed IPC invoker
  const invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = await window.core.ipc.invoke(EXT_ID, channel, args[0])
    if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
    return res.data
  }

  // Load history on mount
  useEffect(() => {
    invoke('getHistory').then(setHistory).catch(() => {})
  }, [])

  // Greet when query changes (non-empty)
  useEffect(() => {
    if (!query.trim()) return
    invoke('greet', { name: query.trim() })
      .then((g) => {
        setLastGreeting(g)
        setHistory((h) => [g, ...h].slice(0, 50))
      })
      .catch(() => {})
  }, [query])

  const { selectedIndex } = _useListNavigation(history, {
    onEnter: (item) => {
      window.core.ipc.invoke('kernel', 'clipboardWrite', { text: item.message })
    },
    enterLabel: 'Copy',
    enterHint: '↵',
  })

  if (history.length === 0) {
    return EmptyState ? (
      <EmptyState title="No greetings yet" description="Type a name in the search bar to greet someone." />
    ) : null
  }

  return List && ListItem && ListItemText && ListItemMeta ? (
    <List>
      {history.map((g, idx) => (
        <ListItem key={g.id} active={idx === selectedIndex}>
          <ListItemText primary={g.message} />
          <ListItemMeta>{new Date(g.createdAt).toLocaleDateString()}</ListItemMeta>
        </ListItem>
      ))}
    </List>
  ) : null
}
```

## Step 7: Install and Test

If you created the extension in `~/.nuxy/extensions/`, restart Nuxy:

```bash
# Toggle the window after restart to trigger a fresh load
echo "toggle" | nc -U /tmp/nuxy.sock
```

If you created the extension in the repo's `extensions/` directory, `pnpm dev` will auto-sync it.

Open the launcher and look for "Hello World" in the tool list. Type a name in the omnibar and the extension will greet you.

## Complete File Checklist

```
com.example.hello-world/
  manifest.json      ✓ required
  types.ts           ✓ data models + IPC channel map
  backend.ts         ✓ register() function
  backend.test.ts    ✓ test coverage for all handlers
  frontend.tsx       ✓ React component (window.React + window.UI)
```

## Next Steps

- [Manifest Reference](/extensions/manifest) — full manifest.json field documentation
- [CoreContext API](/extensions/core-context) — all backend APIs (clipboard, storage, db, shell, i18n, …)
- [Frontend Guide](/extensions/frontend) — keyboard navigation, theme tokens, i18n in frontends
- [Testing Extensions](/extensions/testing) — full testing patterns and mock CoreContext usage
