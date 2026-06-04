import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { Snippet } from './types.ts'

describe('snippets backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => unknown>

  beforeEach(() => {
    const result = createMockCore({
      i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
    })
    core = result.core
    handlers = result.handlers as Record<string, (payload?: unknown) => unknown>
    register(core)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers a tool named "snippets"', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'snippets' })
  })

  describe('getSnippets', () => {
    it('returns empty array when storage is null', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
      const result = await (handlers['getSnippets'] as (p: unknown) => Promise<Snippet[]>)({})
      expect(result).toEqual([])
    })

    it('returns items sorted by updatedAt descending', async () => {
      const items: Snippet[] = [
        {
          id: 'a',
          title: 'First',
          content: 'first content',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b',
          title: 'Second',
          content: 'second content',
          tags: [],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'c',
          title: 'Third',
          content: 'third content',
          tags: [],
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items)
      const result = await (handlers['getSnippets'] as (p: unknown) => Promise<Snippet[]>)({})
      expect(result[0].id).toBe('c')
      expect(result[1].id).toBe('b')
      expect(result[2].id).toBe('a')
    })

    it('filters by query case-insensitively on title, content, and tags', async () => {
      const items: Snippet[] = [
        {
          id: 'a',
          title: 'Hello World',
          content: 'some text',
          tags: ['greeting'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'b',
          title: 'Git command',
          content: 'git commit -m "fix"',
          tags: ['git', 'terminal'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'c',
          title: 'Greet user',
          content: 'hello there',
          tags: [],
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items)
      const result = await (handlers['getSnippets'] as (p: unknown) => Promise<Snippet[]>)({
        query: 'HELLO',
      })
      // Matches "Hello World" (title) and "Greet user" (content: "hello there")
      expect(result).toHaveLength(2)
      expect(result.map((s) => s.id).sort()).toEqual(['a', 'c'].sort())
    })
  })

  describe('addSnippet', () => {
    it('creates a snippet with correct shape and returns it', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      const result = await (handlers['addSnippet'] as (p: unknown) => Promise<Snippet>)({
        title: 'My snippet',
        content: 'const x = 1',
        tags: ['js'],
      })
      expect(result).toMatchObject({
        title: 'My snippet',
        content: 'const x = 1',
        tags: ['js'],
      })
      expect(typeof result.id).toBe('string')
      expect(result.id.length).toBeGreaterThan(0)
      expect(typeof result.createdAt).toBe('string')
      expect(typeof result.updatedAt).toBe('string')
    })

    it('calls storage.write and new item is prepended (most recent first)', async () => {
      const existing: Snippet[] = [
        {
          id: 'old-id',
          title: 'Old snippet',
          content: 'old content',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existing)
      const newSnippet = await (handlers['addSnippet'] as (p: unknown) => Promise<Snippet>)({
        title: 'New snippet',
        content: 'new content',
      })
      expect(core.storage.write).toHaveBeenCalledWith(
        'snippets.json',
        expect.arrayContaining([
          expect.objectContaining({ id: newSnippet.id }),
          expect.objectContaining({ id: 'old-id' }),
        ])
      )
      // new item should be first in the written array
      const writtenList = (core.storage.write as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as Snippet[]
      expect(writtenList[0].id).toBe(newSnippet.id)
      expect(writtenList[1].id).toBe('old-id')
    })
  })

  describe('deleteSnippet', () => {
    it('removes the item and updates storage', async () => {
      const items: Snippet[] = [
        {
          id: 'keep',
          title: 'Keep',
          content: 'keep content',
          tags: [],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'del',
          title: 'Delete me',
          content: 'delete content',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items)
      const result = await (handlers['deleteSnippet'] as (p: unknown) => Promise<Snippet[]>)({
        id: 'del',
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('keep')
      expect(core.storage.write).toHaveBeenCalledWith(
        'snippets.json',
        expect.arrayContaining([expect.objectContaining({ id: 'keep' })])
      )
      const written = (core.storage.write as ReturnType<typeof vi.fn>).mock.calls[0][1] as Snippet[]
      expect(written.find((s) => s.id === 'del')).toBeUndefined()
    })

    it('logs warn and returns list unchanged when id not found', async () => {
      const items: Snippet[] = [
        {
          id: 'existing',
          title: 'Existing',
          content: 'content',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items)
      const result = await (handlers['deleteSnippet'] as (p: unknown) => Promise<Snippet[]>)({
        id: 'nonexistent',
      })
      expect(core.logger.warn).toHaveBeenCalled()
      expect(core.storage.write).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('existing')
    })
  })

  describe('copySnippet', () => {
    it('calls clipboard.writeText with the snippet content', async () => {
      const items: Snippet[] = [
        {
          id: 'abc',
          title: 'Test snippet',
          content: 'console.log("hello")',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce(items)
      const result = await (handlers['copySnippet'] as (p: unknown) => Promise<{ copied: true }>)({
        id: 'abc',
      })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('console.log("hello")')
      expect(result).toEqual({ copied: true })
    })

    it('throws Error when snippet id is not found', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      await expect(
        (handlers['copySnippet'] as (p: unknown) => Promise<{ copied: true }>)({
          id: 'missing',
        })
      ).rejects.toThrow()
    })
  })

  describe('saveClipboardAsSnippet', () => {
    it('reads clipboard, creates snippet with title truncated to 40 chars + ellipsis', async () => {
      const longContent =
        'This is a very long piece of content that exceeds forty characters easily'
      ;(core.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce(longContent)
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      const result = await (handlers['saveClipboardAsSnippet'] as (p: unknown) => Promise<Snippet>)(
        undefined
      )
      expect(result.content).toBe(longContent)
      expect(result.title).toBe(longContent.trim().slice(0, 40) + '...')
      expect(result.title.endsWith('...')).toBe(true)
    })

    it('uses full content as title when content is 40 chars or fewer', async () => {
      const shortContent = 'Short snippet'
      ;(core.clipboard.readText as ReturnType<typeof vi.fn>).mockResolvedValueOnce(shortContent)
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
      const result = await (handlers['saveClipboardAsSnippet'] as (p: unknown) => Promise<Snippet>)(
        undefined
      )
      expect(result.title).toBe('Short snippet')
      expect(result.title.endsWith('...')).toBe(false)
    })
  })
})
