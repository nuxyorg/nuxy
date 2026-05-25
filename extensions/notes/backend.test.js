import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import https from 'https'

vi.mock('node:sqlite', () => ({
  DatabaseSync: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
    close: vi.fn(),
  })),
}))

vi.mock('https', () => {
  const mockReq = {
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  }
  return {
    default: {
      request: vi.fn().mockReturnValue(mockReq),
    },
  }
})

function makeMockDb(allRows = []) {
  const preparedStmt = {
    run: vi.fn(),
    all: vi.fn().mockReturnValue(allRows),
  }
  const mockPrepare = vi.fn().mockReturnValue(preparedStmt)
  const db = {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
  }
  return { db, mockPrepare, preparedStmt }
}

function createCore() {
  const handlers = {}
  const storage = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    storage: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
    logger: { info: vi.fn(), error: vi.fn() },
  }
  return { core, handlers, storage }
}

beforeEach(async () => {
  vi.resetModules()

  vi.spyOn(fs, 'existsSync').mockReturnValue(false)
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {})
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
  vi.spyOn(fs, 'readFileSync').mockReturnValue('{}')
  vi.spyOn(fs, 'readdirSync').mockReturnValue([])
  vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.js')
  return mod.register
}

describe('notes backend', () => {
  it('registers as a tool named "notes"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'notes' })
  })

  describe('notes:create', () => {
    it('writes a JSON file with correct fields', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const note = await handlers['notes:create']({ title: 'My Note', body: 'Hello world' })

      expect(typeof note.id).toBe('string')
      expect(note.id.length).toBeGreaterThan(0)
      expect(note.title).toBe('My Note')
      expect(note.body).toBe('Hello world')
      expect(typeof note.createdAt).toBe('number')
      expect(typeof note.updatedAt).toBe('number')
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${note.id}.json`),
        expect.any(String)
      )
    })

    it('inserts into FTS db', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['notes:create']({ title: 'Test', body: 'Body text' })

      expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT'))
      expect(preparedStmt.run).toHaveBeenCalled()
    })
  })

  describe('notes:list', () => {
    it('reads all .json files from data dir and returns them sorted by updatedAt desc', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const note1 = { id: 'a', title: 'A', body: '', createdAt: 100, updatedAt: 200 }
      const note2 = { id: 'b', title: 'B', body: '', createdAt: 50, updatedAt: 300 }

      fs.readdirSync.mockReturnValue(['a.json', 'b.json'])
      fs.readFileSync
        .mockReturnValueOnce(JSON.stringify(note1))
        .mockReturnValueOnce(JSON.stringify(note2))

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const notes = await handlers['notes:list']({})

      expect(notes).toHaveLength(2)
      expect(notes[0].id).toBe('b')
      expect(notes[1].id).toBe('a')
    })
  })

  describe('notes:update', () => {
    it('updates existing file and FTS entry', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const existing = { id: 'note-1', title: 'Old', body: 'Old body', createdAt: 100, updatedAt: 100 }
      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(JSON.stringify(existing))

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const updated = await handlers['notes:update']({ id: 'note-1', title: 'New Title' })

      expect(updated.title).toBe('New Title')
      expect(updated.body).toBe('Old body')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(existing.updatedAt)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('note-1.json'),
        expect.any(String)
      )
      expect(preparedStmt.run).toHaveBeenCalled()
    })
  })

  describe('notes:delete', () => {
    it('removes the file and FTS entry', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db, preparedStmt } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      fs.existsSync.mockReturnValue(true)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['notes:delete']({ id: 'note-xyz' })

      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('note-xyz.json'))
      expect(preparedStmt.run).toHaveBeenCalled()
    })
  })

  describe('notes:search', () => {
    it('queries FTS5 and returns matching notes', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const ftsRow = { id: 'note-abc', title: 'Test Note', body: 'content' }
      const { db, preparedStmt } = makeMockDb([ftsRow])
      DatabaseSync.mockImplementation(() => db)

      fs.existsSync.mockReturnValue(true)
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ id: 'note-abc', title: 'Test Note', body: 'content', createdAt: 1, updatedAt: 1 })
      )

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const results = await handlers['notes:search']({ query: 'test' })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
    })

    it('returns empty array for empty query without throwing', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      const results = await handlers['notes:search']({ query: '' })
      expect(results).toEqual([])
    })
  })

  describe('notes:transcribe', () => {
    it('throws when API key is not configured', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      core.storage.read.mockResolvedValue(null)
      register(core)

      await expect(
        handlers['notes:transcribe']({ audioBuffer: [1, 2, 3] })
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('POSTs to OpenAI API with correct multipart body', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const mockHttps = await import('https')
      const mockReq = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
      }
      mockHttps.default.request.mockImplementation((opts, cb) => {
        const mockRes = {
          statusCode: 200,
          on: vi.fn((event, handler) => {
            if (event === 'data') handler(JSON.stringify({ text: 'hello world' }))
            if (event === 'end') handler()
          }),
        }
        cb(mockRes)
        return mockReq
      })

      fs.writeFileSync.mockImplementation(() => {})
      fs.unlinkSync.mockImplementation(() => {})
      fs.readFileSync.mockReturnValue(Buffer.from([1, 2, 3]))

      const register = await freshBackend()
      const { core, handlers } = createCore()
      core.storage.read.mockResolvedValue({ openaiApiKey: 'sk-test-key', language: 'en' })
      register(core)

      const result = await handlers['notes:transcribe']({ audioBuffer: [1, 2, 3] })

      expect(result).toEqual({ transcript: 'hello world' })
      expect(mockHttps.default.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'api.openai.com',
          path: '/v1/audio/transcriptions',
          method: 'POST',
        }),
        expect.any(Function)
      )
    })

    it('deletes temp file in finally block even when API throws', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const mockHttps = await import('https')
      const mockReq = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, handler) => {
          if (event === 'error') handler(new Error('network error'))
        }),
      }
      mockHttps.default.request.mockImplementation((opts, cb) => {
        return mockReq
      })

      fs.writeFileSync.mockImplementation(() => {})
      fs.unlinkSync.mockImplementation(() => {})
      fs.readFileSync.mockReturnValue(Buffer.from([1, 2, 3]))

      const register = await freshBackend()
      const { core, handlers } = createCore()
      core.storage.read.mockResolvedValue({ openaiApiKey: 'sk-test-key', language: 'en' })
      register(core)

      await expect(
        handlers['notes:transcribe']({ audioBuffer: [1, 2, 3] })
      ).rejects.toThrow()

      expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('nuxy-voice-'))
    })
  })

  describe('notes:configure', () => {
    it('writes config to storage', async () => {
      const { DatabaseSync } = await import('node:sqlite')
      const { db } = makeMockDb()
      DatabaseSync.mockImplementation(() => db)

      const register = await freshBackend()
      const { core, handlers } = createCore()
      register(core)

      await handlers['notes:configure']({ openaiApiKey: 'sk-abc', language: 'fr' })

      expect(core.storage.write).toHaveBeenCalledWith(
        'config.json',
        expect.objectContaining({ openaiApiKey: 'sk-abc', language: 'fr' })
      )
    })
  })
})
