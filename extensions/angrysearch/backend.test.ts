import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'

interface MockPreparedStmt {
  run: ReturnType<typeof vi.fn>
  all: ReturnType<typeof vi.fn>
}

interface MockDb {
  exec: ReturnType<typeof vi.fn>
  prepare: ReturnType<typeof vi.fn>
  function: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

interface MockDbResult {
  db: MockDb
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: MockPreparedStmt
}

function makeMockDb(allRows: unknown[] = []): MockDbResult {
  const preparedStmt: MockPreparedStmt = {
    run: vi.fn(),
    all: vi.fn().mockReturnValue(allRows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db: MockDb = {
    exec: vi.fn(),
    prepare: mockPrepare,
    function: vi.fn(),
    close: vi.fn(),
  }
  return { db, mockPrepare, preparedStmt }
}

function createCore(dbArg: MockDbResult | null = null): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  db: MockDb
} {
  const { db } = dbArg ?? makeMockDb()
  const { core, handlers } = createMockCore(vi, {
    db: { open: vi.fn().mockReturnValue(db) },
    fs: {
      readDir: vi.fn().mockResolvedValue([]),
      mkdir: vi.fn().mockResolvedValue(undefined),
      fileExists: vi.fn().mockResolvedValue(false),
    },
    shell: {
      open: vi.fn().mockResolvedValue(undefined),
      exec: vi.fn().mockResolvedValue({ stdout: '', code: 0 }),
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

async function freshBackend(): Promise<(core: unknown) => void> {
  const mod = await import('./backend.ts')
  return mod.register
}

describe('angrysearch backend', () => {
  it('registers as a tool named "angrysearch"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    register(core)
    expect(
      (core as { registry: { registerTool: ReturnType<typeof vi.fn> } }).registry.registerTool
    ).toHaveBeenCalledWith({ name: 'angrysearch' })
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
    it('returns { isUpdating: false, lastUpdate: null, exists: false } on a fresh module', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      // Prevent background db open from succeeding immediately
      ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockImplementation(() => {
        throw new Error('no db')
      })
      register(core)
      // Wait for async updateDatabase to settle
      for (let i = 0; i < 20; i++) await Promise.resolve()
      const status = await handlers.getStatus()
      expect((status as { isUpdating: boolean }).isUpdating).toBe(false)
      expect((status as { lastUpdate: string | null }).lastUpdate).toBeNull()
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
      ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockImplementation(() => {
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
      for (let i = 0; i < 20; i++) await Promise.resolve()
      await updatePromise

      const status = await handlers.getStatus()
      expect((status as { isUpdating: boolean }).isUpdating).toBe(false)
    })

    it('sets lastUpdate to an ISO date string after the scan completes', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      expect(((await handlers.getStatus()) as { lastUpdate: string | null }).lastUpdate).toBeNull()

      await handlers.updateDatabase()
      for (let i = 0; i < 20; i++) await Promise.resolve()

      const { lastUpdate } = (await handlers.getStatus()) as { lastUpdate: string | null }
      expect(typeof lastUpdate).toBe('string')
      expect(() => new Date(lastUpdate!)).not.toThrow()
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
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)

        const register = await freshBackend()
        register(core)
        // Wait for initial updateDatabase to populate activeDb
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        await handlers.search({ query: 'foo' })
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('LIKE'))
        expect(db.prepare().all).toHaveBeenCalledWith('%foo%')
      })

      it('applies the LIMIT 500 clause', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        await handlers.search({ query: 'foo' })
        const sql = mockPrepare.mock.calls.find(([s]: [string]) => /LIMIT/i.test(s))?.[0]
        expect(sql).toMatch(/LIMIT 500/i)
      })
    })

    describe('REGEXP query path', () => {
      it('uses a REGEXP query when regex: true is passed', async () => {
        const { db, mockPrepare } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        await handlers.search({ query: 'foo.*bar', regex: true })
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('REGEXP'))
      })

      it('passes the raw query to stmt.all() in regex mode', async () => {
        const { db } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        await handlers.search({ query: 'foo.*bar', regex: true })
        expect(db.prepare().all).toHaveBeenCalledWith('foo.*bar')
      })

      it('returns empty items for invalid regex without throwing', async () => {
        const { db } = makeMockDb([])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        await expect(handlers.search({ query: '[unclosed', regex: true })).resolves.toHaveProperty(
          'items'
        )
      })
    })

    describe('row-to-item mapping', () => {
      it('maps a file row to the expected item shape', async () => {
        const { db } = makeMockDb([{ path: '/home/user/file.txt', directory: '0' }])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
        const { items } = (await handlers.search({ query: 'deep' })) as {
          items: { title: string }[]
        }
        expect(items[0].title).toBe('deep-file.json')
      })

      it('treats directory value 0 (number) as isDir: false', async () => {
        const { db } = makeMockDb([{ path: '/file', directory: 0 }])
        const register = await freshBackend()
        const { core, handlers } = createCore({ db })
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockReturnValue(db)
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
        // make db.open throw so activeDb stays null
        ;(core as { db: { open: ReturnType<typeof vi.fn> } }).db.open.mockImplementation(() => {
          throw new Error('no db')
        })
        register(core)
        for (let i = 0; i < 20; i++) await Promise.resolve()
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
      expect(
        (core as { shell: { open: ReturnType<typeof vi.fn> } }).shell.open
      ).toHaveBeenCalledWith('/home/user/file.txt')
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
      expect(
        (core as { shell: { open: ReturnType<typeof vi.fn> } }).shell.open
      ).toHaveBeenCalledWith('/home/user/docs')
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
