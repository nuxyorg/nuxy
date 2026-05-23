import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import { execFile } from 'child_process'

// Hoisted mocks — vitest re-applies these after vi.resetModules() so each fresh
// import of backend.js sees clean mock implementations.

vi.mock('node:sqlite', () => ({
  DatabaseSync: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    function: vi.fn(),
    close: vi.fn(),
  })),
}))

vi.mock('child_process', () => ({
  execFile: vi.fn((_cmd, _args, cb) => cb(null)),
}))

// Empty async-iterable directory — used to make updateDatabase() complete without
// touching the real filesystem.
const emptyDir = {
  [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true }) }),
}

function makeMockDb(allRows = []) {
  const preparedStmt = {
    run: vi.fn(),
    all: vi.fn().mockReturnValue(allRows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db = {
    exec: vi.fn(),
    prepare: mockPrepare,
    function: vi.fn(),
    close: vi.fn(),
  }
  return { db, mockPrepare, preparedStmt }
}

function createCore() {
  const handlers = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    logger: { info: vi.fn(), error: vi.fn() },
  }
  return { core, handlers }
}

// Each test gets a fresh backend module so module-level singletons
// (isUpdating, lastUpdate, activeDb) start from their initial values.
// vi.resetModules() clears the module cache; the hoisted vi.mock() factories
// are re-applied on the next import within the same test.
beforeEach(async () => {
  vi.resetModules()

  // fs spies are set up AFTER resetModules so the patched fs module is the one
  // the freshly-imported backend.js will require at runtime.
  vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
  vi.spyOn(fs, 'rmSync').mockImplementation(() => {})
  vi.spyOn(fs, 'renameSync').mockImplementation(() => {})
  vi.spyOn(fs.promises, 'opendir').mockResolvedValue(emptyDir)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: import a fresh backend module (must be called after resetModules).
async function freshBackend() {
  const mod = await import('./backend.js')
  return mod.register
}

// ─── Registration ────────────────────────────────────────────────────────────

describe('angrysearch backend', () => {
  it('registers as a tool named "angrysearch"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'angrysearch' })
  })

  it('registers exactly four IPC handlers', async () => {
    const register = await freshBackend()
    const { core, handlers } = createCore()
    register(core)
    expect(Object.keys(handlers).sort()).toEqual(
      ['getStatus', 'openFile', 'openLocation', 'search', 'updateDatabase'].sort()
    )
  })

  // ─── getStatus ─────────────────────────────────────────────────────────────

  describe('getStatus handler', () => {
    it('returns { isUpdating: false, lastUpdate: null, exists: true } on a fresh module', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const status = await handlers.getStatus()
      expect(status).toEqual({ isUpdating: false, lastUpdate: null, exists: true })
    })

    it('exists reflects whether the DB file is present (false case)', async () => {
      fs.existsSync.mockReturnValue(false)
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const status = await handlers.getStatus()
      // When DB does not exist register() triggers a background updateDatabase(),
      // so isUpdating may be true; but exists should match existsSync result for DB_PATH.
      expect(status.exists).toBe(false)
    })
  })

  // ─── updateDatabase handler ─────────────────────────────────────────────────

  describe('updateDatabase handler', () => {
    it('returns true immediately (the update runs in the background)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.updateDatabase()
      expect(result).toBe(true)
    })

    it('does not throw even when DatabaseSync.exec fails', async () => {
      // updateDatabase internally calls db.exec — ensure failure is swallowed.
      const { DatabaseSync } = await import('node:sqlite')
      DatabaseSync.mockImplementationOnce(() => ({
        exec: vi.fn().mockImplementation(() => { throw new Error('disk full') }),
        prepare: vi.fn(),
        function: vi.fn(),
        close: vi.fn(),
      }))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      // Should resolve without rejecting
      await expect(handlers.updateDatabase()).resolves.toBe(true)
    })

    it('isUpdating returns to false after the background scan finishes', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      // Trigger update and wait for the async scan loop to drain.
      // opendir mock returns an empty directory so the scan completes in 1 iteration.
      const updatePromise = handlers.updateDatabase()
      // Flush the microtask/setImmediate queue thoroughly so updateDatabase() finishes.
      for (let i = 0; i < 20; i++) await Promise.resolve()
      await updatePromise

      const status = await handlers.getStatus()
      expect(status.isUpdating).toBe(false)
    })

    it('sets lastUpdate to an ISO date string after the scan completes', async () => {
      // Prime the DatabaseSync mock so the TEMP DB used inside updateDatabase
      // has a working exec() — needed before freshBackend() imports the module.
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb([])
      // Use mockImplementation (not Once) so all DatabaseSync calls in this
      // test get a valid db object with exec/prepare/close functions.
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      // Confirm it is null before any update
      expect((await handlers.getStatus()).lastUpdate).toBeNull()

      // Run and drain the async scan loop
      await handlers.updateDatabase()
      for (let i = 0; i < 20; i++) await Promise.resolve()

      const { lastUpdate } = await handlers.getStatus()
      expect(typeof lastUpdate).toBe('string')
      expect(() => new Date(lastUpdate)).not.toThrow()
      expect(new Date(lastUpdate).toString()).not.toBe('Invalid Date')
    })
  })

  // ─── search handler ─────────────────────────────────────────────────────────

  describe('search handler', () => {
    describe('short-query guard', () => {
      it('returns empty items for empty string', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search({ query: '' })).items).toHaveLength(0)
      })

      it('returns empty items for a 1-character query', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search({ query: 'a' })).items).toHaveLength(0)
      })

      it('returns empty items for a 2-character query', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search({ query: 'ab' })).items).toHaveLength(0)
      })

      it('does NOT short-circuit for a 3-character query', async () => {
        // With DB mocked to return [], items is [] but the reason is "no results" not "too short".
        // The LIKE prepare call must happen.
        const { DatabaseSync } = await import('node:sqlite')
        const { db, mockPrepare } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        await handlers.search({ query: 'foo' })
        expect(mockPrepare).toHaveBeenCalled()
      })

      it('returns empty items for undefined payload', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search(undefined)).items).toHaveLength(0)
      })

      it('returns empty items for missing query key', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search({})).items).toHaveLength(0)
      })

      it('trims query before checking length — 3 spaces is still too short', async () => {
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        expect((await handlers.search({ query: '   ' })).items).toHaveLength(0)
      })
    })

    describe('LIKE query path', () => {
      it('uses a LIKE query with % wildcards wrapping the search term', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db, mockPrepare } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        await handlers.search({ query: 'foo' })

        expect(mockPrepare).toHaveBeenCalledWith(
          expect.stringContaining('LIKE')
        )
        // Verify the wildcard argument passed to stmt.all()
        expect(db.prepare().all).toHaveBeenCalledWith('%foo%')
      })

      it('applies the LIMIT 500 clause in the LIKE query', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db, mockPrepare } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        await handlers.search({ query: 'foo' })

        const sql = mockPrepare.mock.calls[0][0]
        expect(sql).toMatch(/LIMIT 500/i)
      })
    })

    describe('REGEXP query path', () => {
      it('uses a REGEXP query when regex: true is passed', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db, mockPrepare } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        await handlers.search({ query: 'foo.*bar', regex: true })

        expect(mockPrepare).toHaveBeenCalledWith(
          expect.stringContaining('REGEXP')
        )
      })

      it('passes the raw query (no wildcards) to stmt.all() in regex mode', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        await handlers.search({ query: 'foo.*bar', regex: true })

        expect(db.prepare().all).toHaveBeenCalledWith('foo.*bar')
      })

      it('returns empty items and does not throw for an invalid regex', async () => {
        // The REGEXP sqlite function wraps new RegExp() in try/catch; an invalid
        // pattern should not bubble up to the handler.
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        // '[unclosed bracket' is invalid regex syntax
        await expect(handlers.search({ query: '[unclosed', regex: true })).resolves.toHaveProperty('items')
      })
    })

    describe('row-to-item mapping', () => {
      it('maps a file row to the expected item shape', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([{ path: '/home/user/file.txt', directory: '0' }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'file' })

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
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([{ path: '/home/user/docs', directory: '1' }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'doc' })

        expect(items).toHaveLength(1)
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
          { path: '/home/user/sub',   directory: '1' },
        ]
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb(rows)
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'home' })

        expect(items).toHaveLength(3)
        expect(items[0].title).toBe('a.txt')
        expect(items[1].title).toBe('b.txt')
        expect(items[2].title).toBe('sub')
        expect(items[2].isDir).toBe(true)
      })

      it('uses path.basename as the title (last path segment)', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([{ path: '/a/b/c/deep-file.json', directory: '0' }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'deep' })

        expect(items[0].title).toBe('deep-file.json')
      })

      it('id is the path prefixed with "angry-"', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([{ path: '/etc/hosts', directory: '0' }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'host' })

        expect(items[0].id).toBe('angry-/etc/hosts')
      })

      it('treats directory value "0" (number) as isDir: false', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        // directory stored as number, not string, in some rows
        const { db } = makeMockDb([{ path: '/file', directory: 0 }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'fil' })

        expect(items[0].isDir).toBe(false)
      })

      it('treats directory value "1" (number) as isDir: true', async () => {
        const { DatabaseSync } = await import('node:sqlite')
        const { db } = makeMockDb([{ path: '/dir', directory: 1 }])
        DatabaseSync.mockImplementationOnce(() => db)

        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const { items } = await handlers.search({ query: 'dir' })

        expect(items[0].isDir).toBe(true)
      })
    })

    describe('no-DB fallback', () => {
      it('returns empty items when no DB file exists', async () => {
        // Make existsSync return false so getDb() skips opening the DB.
        fs.existsSync.mockReturnValue(false)
        const register = await freshBackend()
        const { core, handlers } = createCore()
        register(core)
        const result = await handlers.search({ query: 'foo' })
        expect(result).toEqual({ items: [] })
      })
    })
  })

  // ─── openFile / openLocation handlers ──────────────────────────────────────

  describe('openFile handler', () => {
    it('calls xdg-open with the given file path', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      await handlers.openFile('/home/user/file.txt')
      expect(execFile).toHaveBeenCalledWith('xdg-open', ['/home/user/file.txt'], expect.any(Function))
    })

    it('returns true when xdg-open succeeds (no error)', async () => {
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(null))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openFile('/home/user/file.txt')
      expect(result).toBe(true)
    })

    it('returns false when xdg-open fails', async () => {
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(new Error('command not found')))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openFile('/home/user/file.txt')
      expect(result).toBe(false)
    })
  })

  describe('openLocation handler', () => {
    it('opens the parent directory of the given file', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      await handlers.openLocation('/home/user/docs/report.pdf')
      expect(execFile).toHaveBeenCalledWith('xdg-open', ['/home/user/docs'], expect.any(Function))
    })

    it('returns true when xdg-open succeeds', async () => {
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(null))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openLocation('/home/user/file.txt')
      expect(result).toBe(true)
    })

    it('returns false when xdg-open fails', async () => {
      execFile.mockImplementationOnce((_cmd, _args, cb) => cb(new Error('not found')))
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.openLocation('/home/user/file.txt')
      expect(result).toBe(false)
    })

    it('opens the directory itself when a directory path is passed', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)
      await handlers.openLocation('/home/user/docs')
      // path.dirname('/home/user/docs') === '/home/user'
      expect(execFile).toHaveBeenCalledWith('xdg-open', ['/home/user'], expect.any(Function))
    })
  })

  // ─── e2e: realistic search flow ────────────────────────────────────────────

  describe('e2e: search → open flow', () => {
    it('full search result can be opened via openFile', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb([{ path: '/home/user/report.pdf', directory: '0' }])
      DatabaseSync.mockImplementationOnce(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const { items } = await handlers.search({ query: 'report' })
      expect(items).toHaveLength(1)

      const filePath = items[0].value
      await handlers.openFile(filePath)
      expect(execFile).toHaveBeenCalledWith('xdg-open', [filePath], expect.any(Function))
    })

    it('full search result can be opened via openLocation (parent dir)', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb([{ path: '/home/user/docs/notes.txt', directory: '0' }])
      DatabaseSync.mockImplementationOnce(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const { items } = await handlers.search({ query: 'notes' })
      const filePath = items[0].value
      await handlers.openLocation(filePath)
      expect(execFile).toHaveBeenCalledWith('xdg-open', ['/home/user/docs'], expect.any(Function))
    })

    it('search returns empty items at any time even while update is in progress', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      // existsSync returns true so activeDb would be opened, but we did not prime
      // DatabaseSync with rows → returns []. The important thing is it does not throw.
      const [statusBefore, searchResult] = await Promise.all([
        handlers.getStatus(),
        handlers.search({ query: 'abc' }),
      ])
      expect(Array.isArray(searchResult.items)).toBe(true)
    })
  })
})
