import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { DbHandle, PreparedStatement } from '@nuxy/core'

interface MockDb {
  db: DbHandle
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: PreparedStatement
}

function makeMockDb(allRows: Record<string, unknown>[] = []): MockDb {
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

function createCore(dbArg: MockDb | null = null): {
  core: CoreContext
  handlers: Record<string, (payload: unknown) => unknown>
  db: DbHandle
  mockPrepare: ReturnType<typeof vi.fn>
  preparedStmt: PreparedStatement
} {
  const { db, mockPrepare, preparedStmt } = dbArg ?? makeMockDb()
  const { core, handlers } = createMockCore(vi, {
    db: { open: vi.fn().mockReturnValue(db) },
    fs: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      readFile: vi.fn().mockResolvedValue('{}'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      rm: vi.fn().mockResolvedValue(undefined),
    },
  })
  return { core, handlers, db, mockPrepare, preparedStmt }
}

beforeEach(async () => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function freshBackend(): Promise<(core: CoreContext) => Promise<void>> {
  const mod = await import('./backend.ts')
  return mod.register
}

describe('notes backend', () => {
  it('registers as a tool named "notes"', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'notes' })
  })

  describe('notes:create', () => {
    it('writes a JSON file with correct fields', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const note = await (
        handlers['notes:create'] as (
          p: unknown
        ) => Promise<{
          id: string
          title: string
          body: string
          createdAt: number
          updatedAt: number
        }>
      )({ title: 'My Note', body: 'Hello world' })

      expect(typeof note.id).toBe('string')
      expect(note.id.length).toBeGreaterThan(0)
      expect(note.title).toBe('My Note')
      expect(note.body).toBe('Hello world')
      expect(typeof note.createdAt).toBe('number')
      expect(typeof note.updatedAt).toBe('number')
      expect(core.fs.writeFile as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.stringContaining(`${note.id}.json`),
        expect.any(String)
      )
    })

    it('inserts into FTS db', async () => {
      const register = await freshBackend()
      const { core, handlers, db, preparedStmt } = createCore()
      await register(core)

      await (handlers['notes:create'] as (p: unknown) => Promise<unknown>)({
        title: 'Test',
        body: 'Body text',
      })

      expect(db.prepare as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.stringContaining('INSERT')
      )
      expect(preparedStmt.run as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
  })

  describe('notes:list', () => {
    it('reads all .json files from data dir and returns them sorted by updatedAt desc', async () => {
      const note1 = { id: 'a', title: 'A', body: '', createdAt: 100, updatedAt: 200 }
      const note2 = { id: 'b', title: 'B', body: '', createdAt: 50, updatedAt: 300 }

      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.fs.readDir as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: 'a.json', isDir: false },
        { name: 'b.json', isDir: false },
      ])
      ;(core.fs.readFile as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(JSON.stringify(note1))
        .mockResolvedValueOnce(JSON.stringify(note2))
      await register(core)

      const notes = await (handlers['notes:list'] as (p: unknown) => Promise<{ id: string }[]>)({})

      expect(notes).toHaveLength(2)
      expect(notes[0].id).toBe('b')
      expect(notes[1].id).toBe('a')
    })
  })

  describe('notes:update', () => {
    it('updates existing file and FTS entry', async () => {
      const existing = {
        id: 'note-1',
        title: 'Old',
        body: 'Old body',
        createdAt: 100,
        updatedAt: 100,
      }

      const register = await freshBackend()
      const { core, handlers, preparedStmt } = createCore()
      ;(core.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existing))
      await register(core)

      const updated = await (
        handlers['notes:update'] as (
          p: unknown
        ) => Promise<{ title: string; body: string; updatedAt: number }>
      )({ id: 'note-1', title: 'New Title' })

      expect(updated.title).toBe('New Title')
      expect(updated.body).toBe('Old body')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(existing.updatedAt)
      expect(core.fs.writeFile as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.stringContaining('note-1.json'),
        expect.any(String)
      )
      expect(preparedStmt.run as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
  })

  describe('notes:delete', () => {
    it('removes the file and FTS entry', async () => {
      const register = await freshBackend()
      const { core, handlers, preparedStmt } = createCore()
      await register(core)

      await (handlers['notes:delete'] as (p: unknown) => Promise<void>)({ id: 'note-xyz' })

      expect(core.fs.rm as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.stringContaining('note-xyz.json')
      )
      expect(preparedStmt.run as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
  })

  describe('notes:search', () => {
    it('queries FTS5 and returns matching notes', async () => {
      const ftsRow = { id: 'note-abc', title: 'Test Note', body: 'content' }
      const dbMock = makeMockDb([ftsRow])

      const register = await freshBackend()
      const { core, handlers } = createCore(dbMock)
      ;(core.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          id: 'note-abc',
          title: 'Test Note',
          body: 'content',
          createdAt: 1,
          updatedAt: 1,
        })
      )
      await register(core)

      const results = await (handlers['notes:search'] as (p: unknown) => Promise<unknown[]>)({
        query: 'test',
      })

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
    })

    it('returns empty array for empty query without throwing', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const results = await (handlers['notes:search'] as (p: unknown) => Promise<unknown[]>)({
        query: '',
      })
      expect(results).toEqual([])
    })
  })

  describe('notes:transcribe', () => {
    it('throws when API key is not configured', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await register(core)

      await expect(
        (handlers['notes:transcribe'] as (p: unknown) => Promise<unknown>)({
          audioBuffer: [1, 2, 3],
        })
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('POSTs to OpenAI API with correct body and returns transcript', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ text: 'hello world' }),
        })
      )

      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue({
        openaiApiKey: 'sk-test-key',
        language: 'en',
      })
      await register(core)

      const result = await (handlers['notes:transcribe'] as (p: unknown) => Promise<unknown>)({
        audioBuffer: [1, 2, 3],
      })

      expect(result).toEqual({ transcript: 'hello world' })
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('deletes temp file in finally block even when API throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

      const register = await freshBackend()
      const { core, handlers } = createCore()
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue({
        openaiApiKey: 'sk-test-key',
        language: 'en',
      })
      await register(core)

      await expect(
        (handlers['notes:transcribe'] as (p: unknown) => Promise<unknown>)({
          audioBuffer: [1, 2, 3],
        })
      ).rejects.toThrow()

      expect(core.fs.rm as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        expect.stringContaining('nuxy-voice-')
      )
    })
  })

  describe('notes:configure', () => {
    it('writes config to storage', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await (handlers['notes:configure'] as (p: unknown) => Promise<void>)({
        openaiApiKey: 'sk-abc',
        language: 'fr',
      })

      expect(core.storage.write as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        'config.json',
        expect.objectContaining({ openaiApiKey: 'sk-abc', language: 'fr' })
      )
    })
  })
})
