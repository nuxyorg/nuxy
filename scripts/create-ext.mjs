#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSIONS_DIR = path.resolve(__dirname, '../extensions')

const name = process.argv[2]

if (!name) {
  console.error('Usage: pnpm create-ext <name>')
  console.error('Example: pnpm create-ext my-extension')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Name must be lowercase alphanumeric with hyphens (e.g. my-extension)')
  process.exit(1)
}

const extDir = path.join(EXTENSIONS_DIR, name)

if (fs.existsSync(extDir)) {
  console.error(`Extension "${name}" already exists at ${extDir}`)
  process.exit(1)
}

const id = `com.nuxy.${name}`
const displayName = name
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(' ')
const componentName = name
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('')

for (const dir of ['locales', 'components', 'hooks', 'utils', 'dev']) {
  fs.mkdirSync(path.join(extDir, dir), { recursive: true })
}

const files = {
  'manifest.json': JSON.stringify(
    {
      id,
      name: displayName,
      version: '1.0.0',
      type: 'tool',
      icon: name,
      permissions: ['storage'],
      capabilities: { callable: true, caller: false },
      entry: {
        backend: 'backend.ts',
        frontend: 'frontend.tsx',
        settings: 'settings.json',
      },
      locales: { default: 'en', supported: ['en', 'tr'] },
    },
    null,
    2
  ),

  'package.json': JSON.stringify(
    {
      name: `@nuxy-ext/${name}`,
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: { '@nuxyorg/extension-sdk': 'workspace:*' },
    },
    null,
    2
  ),

  'types.ts': `import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export interface ${componentName}Item {
  id: string
  createdAt: string
}

export interface IpcChannels extends IpcChannelMap {
  getItems: { input: void; output: ${componentName}Item[] }
}
`,

  'backend.ts': `import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { ${componentName}Item, IpcChannels } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: '${name}' })

  let items: ${componentName}Item[] = []

  core.ipc.handle('getItems', async (): Promise<IpcChannels['getItems']['output']> => {
    return items
  })
}
`,

  'backend.test.ts': `import { describe, it, expect, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxyorg/extension-sdk'
import { register } from './backend.ts'

describe('${name} backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
    register(core)
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: '${name}' })
  })

  it('getItems returns empty array initially', async () => {
    const result = await handlers['getItems']()
    expect(result).toEqual([])
  })
})
`,

  'frontend.tsx': `const React = window.React
const { useState, useEffect } = React

import type { TypedInvoker } from '@nuxyorg/extension-sdk'
import type { ${componentName}Item, IpcChannels } from './types.ts'

const EXT_ID = '${id}'

interface Props {
  query: string
}

export default function ${componentName}View({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, EmptyState } = window.UI || {}
  const _useListNavigation = (window.UI || {}).useListNavigation || (() => ({ selectedIndex: -1, setSelectedIndex: () => {} }))

  const [items, setItems] = useState<${componentName}Item[]>([])

  const invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = await window.core.ipc.invoke(EXT_ID, channel, args[0])
    if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
    return res.data
  }

  useEffect(() => {
    invoke('getItems').then(setItems).catch(() => {})
  }, [])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((item) => item.id.toLowerCase().includes(q))
  }, [items, query])

  const { selectedIndex } = _useListNavigation(filtered, {
    onEnter: (_item) => {},
    enterLabel: 'Select',
    enterHint: '↵',
  })

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {List && (
        <List>
          {filtered.length === 0 ? (
            EmptyState && (
              <EmptyState
                message={query ? 'No matches.' : 'Nothing here yet.'}
                hint={query ? 'Try a different search.' : 'Items will appear here.'}
              />
            )
          ) : (
            filtered.map((item, idx) =>
              ListItem && ListItemBody && ListItemText ? (
                <ListItem key={item.id} active={idx === selectedIndex}>
                  <ListItemBody>
                    <ListItemText>{item.id}</ListItemText>
                  </ListItemBody>
                </ListItem>
              ) : null
            )
          )}
        </List>
      )}
    </div>
  )
}
`,

  'settings.json': JSON.stringify({ version: 1, fields: [] }, null, 2),

  'dev/mocks.ts': `// IPC mock responses for pnpm dev-ext
// Keys match the channel names in backend.ts / types.ts IpcChannels.
// Values can be static data or async functions: (payload) => data
export default {
  // getItems: [],
  // ping: async (payload) => ({ ok: true }),
}
`,

  'locales/en.json': JSON.stringify({ meta: { name: displayName, direction: 'ltr' } }, null, 2),

  'locales/tr.json': JSON.stringify({ meta: { name: displayName, direction: 'ltr' } }, null, 2),
}

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(extDir, file), content)
}

for (const dir of ['components', 'hooks', 'utils']) {
  fs.writeFileSync(path.join(extDir, dir, '.gitkeep'), '')
}
// dev/ is intentionally not .gitkeep'd — it's for local dev only

console.log(`\nCreated extension: ${displayName}`)
console.log(`  ID:   ${id}`)
console.log(`  Path: ${extDir}\n`)
console.log('Next steps:')
console.log(`  1. Edit extensions/${name}/manifest.json — set permissions, capabilities`)
console.log(`  2. Edit extensions/${name}/types.ts — define IpcChannels and data types`)
console.log(`  3. Edit extensions/${name}/backend.ts — implement IPC handlers`)
console.log(`  4. Edit extensions/${name}/frontend.tsx — build the UI`)
console.log(`  5. Run: pnpm test -- extensions/${name}/backend.test.ts`)
console.log(`  6. Run: pnpm dev-ext ${name}   (frontend preview — no Electron needed)`)
console.log(`  7. Run: pnpm dev               (full app)`)
