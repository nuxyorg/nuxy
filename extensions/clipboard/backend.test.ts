import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CoreContext } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { ClipboardItem } from './types.ts'

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: `id-${Math.random()}`,
    text: 'hello',
    image: null,
    copiedAt: new Date().toISOString(),
    pinned: false,
    ...overrides,
  }
}

function createCore({ storageData = null as ClipboardItem[] | null, clipText = '', clipImage = null as string | null } = {}): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
} {
  const handlers: Record<string, (payload?: unknown) => Promise<unknown>> = {}
  const core = {
    registry: { registerTool: vi.fn(), registerProvider: vi.fn(), registerOrchestrator: vi.fn(), registerTheme: vi.fn(), registerIconPack: vi.fn() },
    ipc: { handle: (ch: string, fn: (payload?: unknown) => Promise<unknown>) => { handlers[ch] = fn } },
    storage: {
      read: vi.fn().mockResolvedValue(storageData),
      write: vi.fn().mockResolvedValue(undefined),
    },
    clipboard: {
      readText: vi.fn().mockResolvedValue(clipText),
      readImage: vi.fn().mockResolvedValue(clipImage),
      writeText: vi.fn().mockResolvedValue(undefined),
      writeImage: vi.fn().mockResolvedValue(undefined),
      writeFiles: vi.fn().mockResolvedValue(undefined),
    },
    fs: {
      fileExists: vi.fn().mockResolvedValue(true),
      readDir: vi.fn(), readFile: vi.fn(), readFileBinary: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn(), rename: vi.fn(), rm: vi.fn(), stat: vi.fn(), homedir: vi.fn().mockReturnValue('/home/user'), tmpdir: vi.fn().mockReturnValue('/tmp'),
    },
    db: { open: vi.fn() },
    shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
    media: { getNowPlaying: vi.fn() },
    extensions: { invoke: vi.fn() },
    logger: { info: vi.fn(), error: vi.fn(), silly: vi.fn(), warn: vi.fn() },
    config: { get: vi.fn() },
  } as CoreContext
  return { core, handlers }
}

// Drain the async init() chain without advancing fake timers
async function flush(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('clipboard backend', () => {
  // Prevent the 1000ms polling interval from firing during tests
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('registers as a tool', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'clipboard' })
  })

  describe('getHistory', () => {
    it('returns empty array before init resolves', async () => {
      const handlers: Record<string, (payload?: unknown) => Promise<unknown>> = {}
      register({
        registry: { registerTool: vi.fn(), registerProvider: vi.fn(), registerOrchestrator: vi.fn(), registerTheme: vi.fn(), registerIconPack: vi.fn() },
        ipc: { handle: (ch: string, fn: (payload?: unknown) => Promise<unknown>) => { handlers[ch] = fn } },
        storage: { read: vi.fn().mockResolvedValue(null), write: vi.fn().mockResolvedValue(undefined) },
        clipboard: { readText: vi.fn().mockResolvedValue(''), readImage: vi.fn().mockResolvedValue(null), writeText: vi.fn(), writeImage: vi.fn(), writeFiles: vi.fn() },
        fs: { fileExists: vi.fn(), readDir: vi.fn(), readFile: vi.fn(), readFileBinary: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn(), rename: vi.fn(), rm: vi.fn(), stat: vi.fn(), homedir: vi.fn().mockReturnValue('/home/user'), tmpdir: vi.fn().mockReturnValue('/tmp') },
        db: { open: vi.fn() },
        shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
        media: { getNowPlaying: vi.fn() },
        extensions: { invoke: vi.fn() },
        logger: { info: vi.fn(), error: vi.fn(), silly: vi.fn(), warn: vi.fn() },
        config: { get: vi.fn() },
      } as CoreContext)
      expect(await handlers.getHistory()).toEqual([])
    })

    it('returns items loaded from storage', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' }), makeItem({ id: 'b', text: 'world' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()
      const result = await handlers.getHistory() as ClipboardItem[]
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('hello')
    })
  })

  describe('clearHistory', () => {
    it('removes all unpinned items', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' }), makeItem({ id: 'b', text: 'world' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.clearHistory()
      expect(result).toEqual([])
    })

    it('preserves pinned items', async () => {
      const items = [
        makeItem({ id: 'a', text: 'important', pinned: true }),
        makeItem({ id: 'b', text: 'temp', pinned: false }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.clearHistory() as ClipboardItem[]
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a')
      expect(result[0].pinned).toBe(true)
    })

    it('persists cleared history to storage', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.clearHistory()
      expect(core.storage.write).toHaveBeenCalledWith('history.json', [])
    })
  })

  describe('pinItem', () => {
    it('marks an item as pinned', async () => {
      const items = [makeItem({ id: 'a', text: 'hello', pinned: false })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.pinItem('a') as ClipboardItem[]
      const item = result.find((i) => i.id === 'a')
      expect(item!.pinned).toBe(true)
    })

    it('moves pinned items to the front', async () => {
      const items = [
        makeItem({ id: 'a', text: 'first', pinned: false }),
        makeItem({ id: 'b', text: 'second', pinned: false }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.pinItem('b') as ClipboardItem[]
      expect(result[0].id).toBe('b')
    })

    it('does nothing if item not found', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.pinItem('nonexistent') as ClipboardItem[]
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a')
    })

    it('persists the pin to storage', async () => {
      const items = [makeItem({ id: 'a', text: 'hello', pinned: false })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      core.storage.write.mockClear()
      await handlers.pinItem('a')
      expect(core.storage.write).toHaveBeenCalledWith('history.json', expect.any(Array))
    })
  })

  describe('unpinItem', () => {
    it('marks a pinned item as unpinned', async () => {
      const items = [makeItem({ id: 'a', text: 'hello', pinned: true })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.unpinItem('a') as ClipboardItem[]
      expect(result[0].pinned).toBe(false)
    })

    it('moves unpinned items behind pinned ones', async () => {
      const items = [
        makeItem({ id: 'a', text: 'pinned', pinned: true }),
        makeItem({ id: 'b', text: 'also-pinned', pinned: true }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.unpinItem('a') as ClipboardItem[]
      const pinned = result.filter((i) => i.pinned)
      const unpinned = result.filter((i) => !i.pinned)
      // All pinned items come before unpinned
      expect(result.indexOf(pinned[0])).toBeLessThan(result.indexOf(unpinned[0]))
    })
  })

  describe('deleteItem', () => {
    it('removes the item from history', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' }), makeItem({ id: 'b', text: 'world' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.deleteItem('a') as ClipboardItem[]
      expect(result.find((i) => i.id === 'a')).toBeUndefined()
      expect(result).toHaveLength(1)
    })

    it('does nothing if id not found', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.deleteItem('ghost') as ClipboardItem[]
      expect(result).toHaveLength(1)
    })

    it('persists deletion to storage', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      core.storage.write.mockClear()
      await handlers.deleteItem('a')
      expect(core.storage.write).toHaveBeenCalledWith('history.json', [])
    })
  })

  describe('copyItem', () => {
    it('writes item text to clipboard', async () => {
      const items = [makeItem({ id: 'a', text: 'copy me' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.copyItem('a')
      expect(core.clipboard.writeText).toHaveBeenCalledWith('copy me')
    })

    it('moves the copied item to the top of history', async () => {
      const items = [
        makeItem({ id: 'a', text: 'first' }),
        makeItem({ id: 'b', text: 'second' }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.copyItem('b') as ClipboardItem[]
      expect(result[0].id).toBe('b')
    })

    it('returns unchanged history if id not found', async () => {
      const items = [makeItem({ id: 'a', text: 'hello' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.copyItem('ghost') as ClipboardItem[]
      expect(result).toHaveLength(1)
    })

    it('uses writeImage for image items', async () => {
      const items = [makeItem({ id: 'a', text: 'img-label', image: 'base64data' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.copyItem('a')
      expect(core.clipboard.writeImage).toHaveBeenCalledWith('base64data')
    })
  })

  describe('checkFile', () => {
    it('returns true when the file exists on disk', async () => {
      const { core, handlers } = createCore()
      core.fs.fileExists.mockResolvedValue(true)
      register(core)
      await flush()

      const result = await handlers.checkFile('/some/path/file.txt')
      expect(result).toBe(true)
      expect(core.fs.fileExists).toHaveBeenCalledWith('/some/path/file.txt')
    })

    it('returns false when the file does not exist', async () => {
      const { core, handlers } = createCore()
      core.fs.fileExists.mockResolvedValue(false)
      register(core)
      await flush()

      const result = await handlers.checkFile('/nonexistent/file.txt')
      expect(result).toBe(false)
    })
  })

  describe('copyFile', () => {
    it('calls writeFiles with the item path for a valid file history item', async () => {
      const items = [makeItem({ id: 'a', text: '/home/user/photo.png' })]
      const { core, handlers } = createCore({ storageData: items })
      core.fs.fileExists.mockResolvedValue(true)
      register(core)
      await flush()

      await handlers.copyFile('a')
      expect(core.clipboard.writeFiles).toHaveBeenCalledWith(['/home/user/photo.png'])
    })

    it('throws when the file does not exist on disk', async () => {
      const items = [makeItem({ id: 'a', text: '/missing/file.txt' })]
      const { core, handlers } = createCore({ storageData: items })
      core.fs.fileExists.mockResolvedValue(false)
      register(core)
      await flush()

      await expect(handlers.copyFile('a')).rejects.toThrow('File not found: /missing/file.txt')
    })

    it('returns updated history with the copied item moved to top', async () => {
      const items = [
        makeItem({ id: 'a', text: '/file-a.txt' }),
        makeItem({ id: 'b', text: '/file-b.txt' }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      core.fs.fileExists.mockResolvedValue(true)
      register(core)
      await flush()

      const result = await handlers.copyFile('b') as ClipboardItem[]
      expect(result[0].id).toBe('b')
    })

    it('returns current history unchanged if item id not found', async () => {
      const items = [makeItem({ id: 'a', text: '/file-a.txt' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      const result = await handlers.copyFile('ghost') as ClipboardItem[]
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a')
      // writeFiles must not have been called
      expect(core.clipboard.writeFiles).not.toHaveBeenCalled()
    })
  })

  describe('sortHistory', () => {
    it('pinned items appear before unpinned after a pin operation', async () => {
      const items = [
        makeItem({ id: 'a', text: 'first', pinned: false }),
        makeItem({ id: 'b', text: 'second', pinned: false }),
        makeItem({ id: 'c', text: 'third', pinned: false }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      // Pinning 'c' (last item) should move it to the front
      const result = await handlers.pinItem('c') as ClipboardItem[]
      const firstUnpinnedIdx = result.findIndex((i) => !i.pinned)
      const lastPinnedIdx = result.map((i) => i.pinned).lastIndexOf(true)
      expect(lastPinnedIdx).toBeLessThan(firstUnpinnedIdx)
    })

    it('mixed pin/unpin operations maintain correct ordering throughout', async () => {
      const items = [
        makeItem({ id: 'a', text: 'alpha', pinned: false }),
        makeItem({ id: 'b', text: 'beta', pinned: false }),
        makeItem({ id: 'c', text: 'gamma', pinned: false }),
        makeItem({ id: 'd', text: 'delta', pinned: false }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      // Pin b and d
      await handlers.pinItem('b')
      await handlers.pinItem('d')

      // Now unpin b — only d should remain pinned at front
      const afterUnpin = await handlers.unpinItem('b') as ClipboardItem[]

      const pinnedItems = afterUnpin.filter((i) => i.pinned)
      const unpinnedItems = afterUnpin.filter((i) => !i.pinned)

      // Exactly one pinned item remains
      expect(pinnedItems).toHaveLength(1)
      expect(pinnedItems[0].id).toBe('d')

      // All pinned items appear before all unpinned items
      const lastPinnedPos = afterUnpin.indexOf(pinnedItems[pinnedItems.length - 1])
      const firstUnpinnedPos = afterUnpin.indexOf(unpinnedItems[0])
      expect(lastPinnedPos).toBeLessThan(firstUnpinnedPos)

      // 'b' is now in the unpinned section
      const bItem = afterUnpin.find((i) => i.id === 'b')!
      expect(bItem.pinned).toBe(false)
    })
  })

  describe('addHistoryItem (deduplication and cap)', () => {
    it('adding same text twice keeps only one entry, most recent at top', async () => {
      // Start with empty history and a clipboard text that triggers two additions via polling
      const { core, handlers } = createCore({ storageData: [], clipText: '' })
      register(core)
      await flush()

      // First tick: clipboard returns 'duplicate text'
      core.clipboard.readText.mockResolvedValue('duplicate text')
      core.clipboard.readImage.mockResolvedValue(null)
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      // Second tick: same text again — should deduplicate
      core.clipboard.readText.mockResolvedValue('duplicate text')
      core.clipboard.readImage.mockResolvedValue(null)
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      // Third tick: different text to force a second poll cycle change detection
      // (the second tick won't fire because lastText already equals 'duplicate text')
      // So after two ticks only one entry should exist
      const result = await handlers.getHistory() as ClipboardItem[]
      const dupes = result.filter((i) => i.text === 'duplicate text')
      expect(dupes).toHaveLength(1)
    })

    it('adding same image twice keeps only one entry', async () => {
      const { core, handlers } = createCore({ storageData: [], clipText: '', clipImage: null })
      register(core)
      await flush()

      // First tick: clipboard returns an image
      core.clipboard.readImage.mockResolvedValue('img-data-abc')
      core.clipboard.readText.mockResolvedValue('')
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      // Reset image to null so second tick does not trigger another add,
      // then add the same image again via a direct copyItem-style roundtrip
      // Instead: use two consecutive image changes, then revert to the same image
      // Simulate: image changes to 'img-data-abc' again (after a different image)
      core.clipboard.readImage.mockResolvedValue('img-data-xyz') // different image
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      core.clipboard.readImage.mockResolvedValue('img-data-abc') // same as first
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      const result = await handlers.getHistory() as ClipboardItem[]
      const withSameImage = result.filter((i) => i.image === 'img-data-abc')
      // Deduplication: only one entry for 'img-data-abc' should exist
      expect(withSameImage).toHaveLength(1)
    })

    it('the 100-item cap evicts oldest unpinned items but preserves pinned ones', async () => {
      // Build exactly 100 unpinned items + 5 pinned items; adding one more via poll must evict the oldest
      const unpinned = Array.from({ length: 100 }, (_, i) =>
        makeItem({ id: `u${i}`, text: `text-${i}`, pinned: false }),
      )
      const pinned = Array.from({ length: 5 }, (_, i) =>
        makeItem({ id: `p${i}`, text: `pinned-${i}`, pinned: true }),
      )
      // sortHistory puts pinned first, then unpinned
      const storageData = [...pinned, ...unpinned]

      const { core, handlers } = createCore({ storageData, clipText: '' })
      register(core)
      await flush()

      // Advance timer once: clipboard returns a new unique text, pushing unpinned to 101 before cap
      core.clipboard.readText.mockResolvedValue('brand-new-item')
      core.clipboard.readImage.mockResolvedValue(null)
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      const result = await handlers.getHistory() as ClipboardItem[]

      // All 5 pinned items must still be present
      const pinnedResult = result.filter((i) => i.pinned)
      expect(pinnedResult).toHaveLength(5)

      // Unpinned count must be capped at 100
      const unpinnedResult = result.filter((i) => !i.pinned)
      expect(unpinnedResult.length).toBeLessThanOrEqual(100)

      // The brand-new item must be present (it's the newest)
      expect(result.some((i) => i.text === 'brand-new-item')).toBe(true)

      // The tail of the unpinned slice (text-99, the last of the original 100) must have been evicted
      // because addHistoryItem prepends the new item and then slices unpinned to 100:
      // [newItem, text-0, ..., text-99] → slice(0,100) → [newItem, text-0, ..., text-98]
      expect(result.some((i) => i.text === 'text-99')).toBe(false)
      // Earlier items are preserved
      expect(result.some((i) => i.text === 'text-0')).toBe(true)
    })
  })

  describe('clipboard polling', () => {
    it('adds a new text entry to history when clipboard changes after one tick', async () => {
      const { core, handlers } = createCore({ storageData: [], clipText: '' })
      register(core)
      await flush()

      // Verify history is empty before timer fires
      expect(await handlers.getHistory()).toHaveLength(0)

      // Simulate clipboard change
      core.clipboard.readText.mockResolvedValue('polled text')
      core.clipboard.readImage.mockResolvedValue(null)

      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      const result = await handlers.getHistory() as ClipboardItem[]
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('polled text')
    })

    it('does not add an entry when clipboard text is unchanged between ticks', async () => {
      const { core, handlers } = createCore({ storageData: [], clipText: 'stable text' })
      register(core)
      await flush()

      // After init, lastText is 'stable text' — poll should not add again
      core.clipboard.readText.mockResolvedValue('stable text')
      core.clipboard.readImage.mockResolvedValue(null)
      await vi.advanceTimersByTimeAsync(1000)
      await flush()

      const result = await handlers.getHistory() as ClipboardItem[]
      // The initial clipboard value was added during init (history was empty + text was non-empty)
      // But the poll tick should NOT add a duplicate
      const stableEntries = result.filter((i) => i.text === 'stable text')
      expect(stableEntries).toHaveLength(1)
    })
  })

  // Integration: realistic clipboard usage flows
  describe('e2e: clipboard lifecycle', () => {
    it('pin item, clear history, pinned item survives', async () => {
      const items = [
        makeItem({ id: 'a', text: 'important' }),
        makeItem({ id: 'b', text: 'junk' }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.pinItem('a')
      const afterClear = await handlers.clearHistory() as ClipboardItem[]

      expect(afterClear).toHaveLength(1)
      expect(afterClear[0].id).toBe('a')
      expect(afterClear[0].pinned).toBe(true)
    })

    it('add items, copy one, it moves to top', async () => {
      const items = [
        makeItem({ id: 'a', text: 'first' }),
        makeItem({ id: 'b', text: 'second' }),
        makeItem({ id: 'c', text: 'third' }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.copyItem('c')
      const result = await handlers.getHistory() as ClipboardItem[]
      expect(result[0].id).toBe('c')
    })

    it('delete multiple items sequentially', async () => {
      const items = [
        makeItem({ id: 'a', text: 'a' }),
        makeItem({ id: 'b', text: 'b' }),
        makeItem({ id: 'c', text: 'c' }),
      ]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.deleteItem('a')
      await handlers.deleteItem('c')
      const result = await handlers.getHistory() as ClipboardItem[]

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('b')
    })

    it('pin, unpin, pin again — ordering stays consistent', async () => {
      const items = [makeItem({ id: 'a', text: 'item' })]
      const { core, handlers } = createCore({ storageData: items })
      register(core)
      await flush()

      await handlers.pinItem('a')
      expect(((await handlers.getHistory()) as ClipboardItem[])[0].pinned).toBe(true)

      await handlers.unpinItem('a')
      expect(((await handlers.getHistory()) as ClipboardItem[])[0].pinned).toBe(false)

      await handlers.pinItem('a')
      expect(((await handlers.getHistory()) as ClipboardItem[])[0].pinned).toBe(true)
    })
  })
})
