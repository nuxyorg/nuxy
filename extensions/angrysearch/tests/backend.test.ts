// fallow-ignore-file code-duplication
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import type { DbHandle, PreparedStatement } from '@nuxyorg/core'

interface MockDbResult {
  db: DbHandle
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: PreparedStatement
}

function makeMockDb(allRows: Record<string, unknown>[] = []): MockDbResult {
  const preparedStmt: PreparedStatement = {
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn().mockReturnValue(allRows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db = {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
    function: vi.fn(),
  } as unknown as DbHandle
  return { db, mockPrepare, preparedStmt }
}

function createCore(dbArg: MockDbResult | null = null): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  db: DbHandle
} {
  const { db } = dbArg ?? makeMockDb()
  const { core, handlers } = createMockCore({
    db: { open: vi.fn().mockReturnValue(db) },
    fs: {
      readDir: vi.fn().mockResolvedValue([]),
      mkdir: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
      rename: vi.fn().mockResolvedValue(undefined),
      homedir: vi.fn().mockReturnValue('/home/user'),
    },
    shell: {
      open: vi.fn().mockResolvedValue(undefined),
      exec: vi.fn().mockResolvedValue({ stdout: '', code: 0 }),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
  })
  return { core, handlers, db }
}

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend(): Promise<(core: CoreContext) => void> {
  const mod = await import('../backend.ts')
  return mod.register
}

/** Drains the microtask queue and any zero-delay setTimeout callbacks. */
async function settle(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('angrysearch backend', () => {
  it('registers as a tool named "angrysearch"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'angrysearch' })
  })

  it('registers exactly five IPC handlers', async () => {
    const register = await freshBackend()
    const { core, handlers } = createCore()
    register(core)
    expect(Object.keys(handlers).sort()).toEqual(
      ['getStatus', 'openFile', 'openLocation', 'search', 'updateDatabase'].sort()
    )
  })

  describe('getStatus handler', () => {
    it('returns { isUpdating: false, lastUpdate: null, exists: false } when db.open throws', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.db.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('no db')
      })
      register(core)
      await settle()
      const status = (await handlers.getStatus()) as {
        isUpdating: boolean
        lastUpdate: string | null
        exists: boolean
      }
      expect(status.isUpdating).toBe(false)
      expect(status.lastUpdate).toBeNull()
      expect(status.exists).toBe(false)
    })
  })

  describe('updateDatabase handler', () => {
    it('returns true immediately (the update runs in the background)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.updateDatabase()
      expect(result).toBe(true)
    })

    it('does not throw even when core.db.open fails', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.db.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('disk full')
      })
      register(core)
      await expect(handlers.updateDatabase()).resolves.toBe(true)
    })

    it('isUpdating returns to false after the scan finishes', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const updatePromise = handlers.updateDatabase()
      await settle()
      await updatePromise

      const status = (await handlers.getStatus()) as { isUpdating: boolean }
      expect(status.isUpdating).toBe(false)
    })

    it('sets lastUpdate to an ISO date string after the scan completes', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      expect(((await handlers.getStatus()) as { lastUpdate: string | null }).lastUpdate).toBeNull()

      await handlers.updateDatabase()
      await settle()

      const { lastUpdate } = (await handlers.getStatus()) as { lastUpdate: string | null }
      expect(typeof lastUpdate).toBe('string')
      expect(() => new Date(lastUpdate!)).not.toThrow()
    })

    it('skips a directory listed in ignoredRoots as a string array (new list field shape)', async () => {
      const { db, mockPrepare, preparedStmt } = makeMockDb([])
      const { core } = createCore({ db, mockPrepare, preparedStmt })
      ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
        if (key === 'scanRoot') return '/'
        if (key === 'ignoredRoots') return ['/proc', '/dev']
        return null
      })
      ;(core.fs.readDir as ReturnType<typeof vi.fn>).mockImplementation(async (dir: string) => {
        if (dir === '/') {
          return [
            { name: 'proc', isDir: true },
            { name: 'home', isDir: true },
          ]
        }
        return []
      })

      const register = await freshBackend()
      register(core)
      await settle()

      expect(core.fs.readDir).not.toHaveBeenCalledWith('/proc')
      expect(core.fs.readDir).toHaveBeenCalledWith('/home')
    })

    it('migrates a legacy comma-separated ignoredRoots string', async () => {
      const { db, mockPrepare, preparedStmt } = makeMockDb([])
      const { core } = createCore({ db, mockPrepare, preparedStmt })
      ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockImplementation(async (key: string) => {
        if (key === 'scanRoot') return '/'
        if (key === 'ignoredRoots') return '/proc,/dev'
        return null
      })
      ;(core.fs.readDir as ReturnType<typeof vi.fn>).mockImplementation(async (dir: string) => {
        if (dir === '/') {
          return [
            { name: 'proc', isDir: true },
            { name: 'home', isDir: true },
          ]
        }
        return []
      })

      const register = await freshBackend()
      register(core)
      await settle()

      expect(core.fs.readDir).not.toHaveBeenCalledWith('/proc')
      expect(core.fs.readDir).toHaveBeenCalledWith('/home')
    })

    it('falls back to the default ignored roots when no setting is saved', async () => {
      const { db, mockPrepare, preparedStmt } = makeMockDb([])
      const { core } = createCore({ db, mockPrepare, preparedStmt })
      ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
      ;(core.fs.readDir as ReturnType<typeof vi.fn>).mockImplementation(async (dir: string) => {
        if (dir === '/') {
          return [
            { name: 'proc', isDir: true },
            { name: 'home', isDir: true },
          ]
        }
        return []
      })

      const register = await freshBackend()
      register(core)
      await settle()

      expect(core.fs.readDir).not.toHaveBeenCalledWith('/proc')
      expect(core.fs.readDir).toHaveBeenCalledWith('/home')
    })

    it('registers a REGEXP custom function on the active db', async () => {
      const { db } = makeMockDb([])
      const register = await freshBackend()
      const { core, handlers } = createCore({
        db,
        mockPrepare: vi.fn(),
        preparedStmt: { run: vi.fn(), get: vi.fn(), all: vi.fn() },
      })
      ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
      register(core)
      await settle()
      await handlers.search({ query: 'foo' })
      expect(db.function).toHaveBeenCalledWith('REGEXP', expect.any(Function))
    })
  })

  describe('search handler', () => {
    describe('short-query guard', () => {
      it('returns empty items for empty string', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect(((await handlers.search({ query: '' })) as { items: unknown[] }).items).toHaveLength(
          0
        )
      })

      it('returns empty items for a 1-character query', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect(
          ((await handlers.search({ query: 'a' })) as { items: unknown[] }).items
        ).toHaveLength(0)
      })

      it('returns empty items for a 2-character query', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect(
          ((await handlers.search({ query: 'ab' })) as { items: unknown[] }).items
        ).toHaveLength(0)
      })

      it('does NOT short-circuit for a 3-character query', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const { core, handlers } = createCore({ db, mockPrepare, preparedStmt: db as any })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)

        const register = await freshBackend()
        register(core)
        await settle()
        await handlers.search({ query: 'foo' })
        expect(mockPrepare).toHaveBeenCalled()
      })

      it('returns empty items for undefined payload', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect(((await handlers.search(undefined)) as { items: unknown[] }).items).toHaveLength(0)
      })

      it('trims query before checking length', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect(
          ((await handlers.search({ query: '   ' })) as { items: unknown[] }).items
        ).toHaveLength(0)
      })
    })

    describe('LIKE query path', () => {
      it('uses a LIKE query with % wildcards wrapping the search term', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db, mockPrepare, preparedStmt: db as any })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        await handlers.search({ query: 'foo' })
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIKE'))
        expect((db.prepare('') as PreparedStatement).all).toHaveBeenCalledWith('%foo%')
      })

      it('applies the configured LIMIT clause (default 500)', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db, mockPrepare, preparedStmt: db as any })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        await handlers.search({ query: 'foo' })
        const sql = mockPrepare.mock.calls.find((call) => /LIMIT/i.test(call[0] as string))?.[0]
        expect(sql).toMatch(/LIMIT 500/i)
      })
    })

    describe('REGEXP query path', () => {
      it('uses a REGEXP query when regex: true is passed', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db, mockPrepare, preparedStmt: db as any })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        await handlers.search({ query: 'foo.*bar', regex: true })
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('REGEXP'))
      })

      it('passes the raw query to stmt.all() in regex mode', async () => {
        const { db } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        await handlers.search({ query: 'foo.*bar', regex: true })
        expect((db.prepare('') as PreparedStatement).all).toHaveBeenCalledWith('foo.*bar')
      })

      it('returns empty items for invalid regex without throwing', async () => {
        const { db } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        await expect(handlers.search({ query: '[unclosed', regex: true })).resolves.toHaveProperty(
          'items'
        )
      })
    })

    describe('row-to-item mapping', () => {
      it('maps a file row to the expected item shape', async () => {
        const { db } = makeMockDb([{ path: '/home/user/file.txt', directory: '0' }])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        const { items } = (await handlers.search({ query: 'file' })) as { items: unknown[] }
        expect(items).toHaveLength(1)
        expect(items[0]).toEqual({
          id: 'angry-/home/user/file.txt',
          title: 'file.txt',
          subtitle: '/home/user/file.txt',
          value: '/home/user/file.txt',
          isDir: false,
        })
      })

      it('maps a directory row to the expected item shape', async () => {
        const { db } = makeMockDb([{ path: '/home/user/docs', directory: '1' }])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        const { items } = (await handlers.search({ query: 'doc' })) as { items: unknown[] }
        expect(items[0]).toEqual({
          id: 'angry-/home/user/docs',
          title: 'docs',
          subtitle: '/home/user/docs',
          value: '/home/user/docs',
          isDir: true,
        })
      })

      it('maps multiple rows preserving order', async () => {
        const rows = [
          { path: '/home/user/a.txt', directory: '0' },
          { path: '/home/user/b.txt', directory: '0' },
          { path: '/home/user/sub', directory: '1' },
        ]
        const { db } = makeMockDb(rows)
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        const { items } = (await handlers.search({ query: 'home' })) as {
          items: { title: string; isDir: boolean }[]
        }
        expect(items).toHaveLength(3)
        expect(items[0].title).toBe('a.txt')
        expect(items[2].isDir).toBe(true)
      })

      it('uses the last path segment as title', async () => {
        const { db } = makeMockDb([{ path: '/a/b/c/deep-file.json', directory: '0' }])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        const { items } = (await handlers.search({ query: 'deep' })) as {
          items: { title: string }[]
        }
        expect(items[0].title).toBe('deep-file.json')
      })

      it('treats directory value 0 (number) as isDir: false', async () => {
        const { db } = makeMockDb([{ path: '/file', directory: 0 }])
        const register = await freshBackend()
        const { core, handlers } = createCore({
          db,
          mockPrepare: vi.fn(),
          preparedStmt: db as any,
        })
        ;(core.db.open as ReturnType<typeof vi.fn>).mockReturnValue(db)
        register(core)
        await settle()
        const { items } = (await handlers.search({ query: 'fil' })) as {
          items: { isDir: boolean }[]
        }
        expect(items[0].isDir).toBe(false)
      })
    })

    describe('no-DB fallback', () => {
      it('returns empty items when no active DB', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        ;(core.db.open as ReturnType<typeof vi.fn>).mockImplementation(() => {
          throw new Error('no db')
        })
        register(core)
        await settle()
        const result = await handlers.search({ query: 'foo' })
        expect(result).toEqual({ items: [] })
      })
    })
  })

  describe('openFile handler', () => {
    it('calls core.shell.open with the given file path', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      await handlers.openFile('/home/user/file.txt')
      expect(core.shell.open).toHaveBeenCalledWith('/home/user/file.txt')
    })

    it('returns true when shell.open succeeds', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openFile('/home/user/file.txt')
      expect(result).toBe(true)
    })
  })

  describe('openLocation handler', () => {
    it('opens the parent directory of the given file', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      await handlers.openLocation('/home/user/docs/report.pdf')
      expect(core.shell.open).toHaveBeenCalledWith('/home/user/docs')
    })

    it('returns true when shell.open succeeds', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openLocation('/home/user/file.txt')
      expect(result).toBe(true)
    })
  })
})
