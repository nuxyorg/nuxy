/* cspell:ignore naruto */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register, type ActionSettings } from '../backend.ts'
import type { NyaaResult } from '../types.ts'

const SAMPLE_HTML = `<!DOCTYPE html><html><body>
<table class="torrent-list">
<thead><tr><th>Cat</th><th>Name</th><th>Links</th><th>Size</th><th>Date</th><th>Seeders</th><th>Leechers</th><th>Downloads</th></tr></thead>
<tbody>
<tr class="default">
  <td><a href="/?c=1_2" title="Anime - English-translated"><img src="/img/1_2.png" alt="Anime - English-translated"></a></td>
  <td colspan="2"><a href="/view/1234567">Test Anime S01E01 [1080p]</a></td>
  <td class="text-center">
    <a href="/download/1234567.torrent"><i class="fa fa-download"></i></a>
    <a href="magnet:?xt=urn:btih:abc123&amp;dn=Test+Anime&amp;tr=http://tracker.example.com"><i class="fa fa-magnet"></i></a>
  </td>
  <td class="text-center">1.23 GiB</td>
  <td class="text-center" data-timestamp="1700000000">2023-11-14</td>
  <td class="text-center">42</td>
  <td class="text-center">7</td>
  <td class="text-center">1234</td>
</tr>
<tr class="success">
  <td><a href="/?c=1_2" title="Anime - English-translated"><img src="/img/1_2.png" alt="Anime - English-translated"></a></td>
  <td colspan="2"><a href="/view/9999999">Trusted Anime S02E01 [720p]</a></td>
  <td class="text-center">
    <a href="/download/9999999.torrent"><i class="fa fa-download"></i></a>
    <a href="magnet:?xt=urn:btih:xyz789&amp;dn=Trusted+Anime"><i class="fa fa-magnet"></i></a>
  </td>
  <td class="text-center">512.0 MiB</td>
  <td class="text-center" data-timestamp="1700050000">2023-11-15</td>
  <td class="text-center">150</td>
  <td class="text-center">3</td>
  <td class="text-center">5678</td>
</tr>
</tbody>
</table>
</body></html>`

function mockFetch(ok = true, html = SAMPLE_HTML): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      text: vi.fn().mockResolvedValue(html),
    })
  )
}

describe('nyaa backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore({
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      shell: {
        open: vi.fn().mockResolvedValue(undefined),
      },
      extensions: {
        invoke: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    }))
    mockFetch()
    register(core)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'nyaa' })
  })

  describe('search', () => {
    it('returns empty array for empty query', async () => {
      expect(await handlers.search({ query: '' })).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('returns empty array for whitespace-only query', async () => {
      expect(await handlers.search({ query: '   ' })).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('parses results correctly', async () => {
      const result = (await handlers.search({ query: 'anime' })) as NyaaResult[]
      expect(result).toHaveLength(2)

      expect(result[0].title).toBe('Test Anime S01E01 [1080p]')
      expect(result[0].id).toBe('1234567')
      expect(result[0].magnet).toContain('magnet:?xt=urn:btih:abc123')
      expect(result[0].size).toBe('1.23 GiB')
      expect(result[0].seeds).toBe(42)
      expect(result[0].leeches).toBe(7)
      expect(result[0].status).toBe('default')
      expect(result[0].category).toBe('Anime - English-translated')
    })

    it('parses trusted (success) rows correctly', async () => {
      const result = (await handlers.search({ query: 'anime' })) as NyaaResult[]
      expect(result[1].status).toBe('success')
      expect(result[1].title).toBe('Trusted Anime S02E01 [720p]')
      expect(result[1].seeds).toBe(150)
      expect(result[1].size).toBe('512.0 MiB')
    })

    it('builds the URL with default settings', async () => {
      await handlers.search({ query: 'one piece' })
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(calledUrl).toContain('nyaa.si')
      expect(calledUrl).toContain('q=one%20piece')
      expect(calledUrl).toContain('s=seeders')
      expect(calledUrl).toContain('o=desc')
    })

    it('uses settings for category and filter', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'category') return '1_0'
        if (key === 'filter') return '1'
        if (key === 'sortBy') return 'date'
        return null
      })
      await handlers.search({ query: 'naruto' })
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(calledUrl).toContain('c=1_0')
      expect(calledUrl).toContain('f=1')
      expect(calledUrl).toContain('s=id')
    })

    it('uses size sort param when sortBy is size', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'sortBy') return 'size'
        return null
      })
      await handlers.search({ query: 'test' })
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(calledUrl).toContain('s=size')
    })

    it('uses downloads sort param when sortBy is completed', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'sortBy') return 'completed'
        return null
      })
      await handlers.search({ query: 'test' })
      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(calledUrl).toContain('s=downloads')
    })

    it('throws when fetch response is not ok', async () => {
      mockFetch(false)
      await expect(handlers.search({ query: 'test' })).rejects.toThrow('HTTP 503')
    })

    it('aborts previous fetch when a new search starts', async () => {
      const signals: AbortSignal[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
          if (opts?.signal) signals.push(opts.signal)
          return new Promise<never>(() => {})
        })
      )

      void handlers.search({ query: 'first' })
      await new Promise<void>((r) => setTimeout(r, 0))

      expect(signals[0]?.aborted).toBe(false)
      void handlers.search({ query: 'second' })
      await new Promise<void>((r) => setTimeout(r, 0))

      expect(signals[0]?.aborted).toBe(true)
    })

    it('returns empty array when HTML has no torrent-list tbody', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          text: vi.fn().mockResolvedValue('<html><body>No results found.</body></html>'),
        })
      )
      const result = await handlers.search({ query: 'empty' })
      expect(result).toEqual([])
    })
  })

  describe('copyMagnet', () => {
    it('writes the magnet link to clipboard', async () => {
      const magnet = 'magnet:?xt=urn:btih:abc123&dn=Test+Anime'
      await handlers.copyMagnet({ magnet })
      expect(core.clipboard.writeText).toHaveBeenCalledWith(magnet)
    })
  })

  describe('copyMagnets', () => {
    it('joins multiple magnets with newline and writes to clipboard', async () => {
      const magnets = ['magnet:?xt=urn:btih:aaa111', 'magnet:?xt=urn:btih:bbb222']
      await handlers.copyMagnets({ magnets })
      expect(core.clipboard.writeText).toHaveBeenCalledWith(
        'magnet:?xt=urn:btih:aaa111\nmagnet:?xt=urn:btih:bbb222'
      )
    })

    it('handles a single magnet in the array', async () => {
      const magnets = ['magnet:?xt=urn:btih:single']
      await handlers.copyMagnets({ magnets })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('magnet:?xt=urn:btih:single')
    })
  })

  describe('downloadTorrent', () => {
    it('opens the correct torrent URL via shell', async () => {
      await handlers.downloadTorrent({ id: '1234567' })
      expect(core.shell.open).toHaveBeenCalledWith('https://nyaa.si/download/1234567.torrent')
    })

    it('opens the correct URL for any given id', async () => {
      await handlers.downloadTorrent({ id: '9999999' })
      expect(core.shell.open).toHaveBeenCalledWith('https://nyaa.si/download/9999999.torrent')
    })
  })

  describe('downloadTorrents', () => {
    it('opens shell for each id in order', async () => {
      await handlers.downloadTorrents({ ids: ['1234567', '9999999'] })
      expect(core.shell.open).toHaveBeenCalledTimes(2)
      expect(core.shell.open).toHaveBeenNthCalledWith(1, 'https://nyaa.si/download/1234567.torrent')
      expect(core.shell.open).toHaveBeenNthCalledWith(2, 'https://nyaa.si/download/9999999.torrent')
    })

    it('does nothing when ids array is empty', async () => {
      await handlers.downloadTorrents({ ids: [] })
      expect(core.shell.open).not.toHaveBeenCalled()
    })
  })

  describe('getActionSettings', () => {
    it('returns default priority order when no setting is saved', async () => {
      const result = await handlers.getActionSettings({})
      expect(result).toEqual({
        enterActionPriority: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
      })
    })

    it('returns the saved enterActionPriority when present', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'enterActionPriority') return ['copyMagnet', 'downloadTorrent']
        return null
      })
      const result = await handlers.getActionSettings({})
      expect(result).toEqual({
        enterActionPriority: ['copyMagnet', 'downloadTorrent', 'torrentClient'],
      })
    })

    it('migrates legacy enterAction copyMagnet with useQbittorrent=true', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'enterAction') return 'copyMagnet'
        if (key === 'useQbittorrent') return true
        return null
      })
      const result = await handlers.getActionSettings({})
      expect(result).toEqual({
        enterActionPriority: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
      })
    })

    it('migrates legacy enterAction copyMagnet with useQbittorrent=false', async () => {
      core.settings.read = vi.fn().mockImplementation(async (key: string) => {
        if (key === 'enterAction') return 'copyMagnet'
        if (key === 'useQbittorrent') return false
        return null
      })
      const result = await handlers.getActionSettings({})
      expect(result).toEqual({
        enterActionPriority: ['copyMagnet', 'downloadTorrent', 'torrentClient'],
      })
    })
  })
})
