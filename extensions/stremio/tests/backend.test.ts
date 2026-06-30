import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'
import type { MetaResult, EpisodeResult, StreamResult } from '../types.ts'

const MOVIE_SEARCH = {
  metas: [
    {
      id: 'tt1375666',
      imdb_id: 'tt1375666',
      type: 'movie',
      name: 'Inception',
      releaseInfo: '2010',
    },
  ],
}
const SERIES_SEARCH = {
  metas: [
    {
      id: 'tt0944947',
      imdb_id: 'tt0944947',
      type: 'series',
      name: 'Game of Thrones',
      releaseInfo: '2011',
    },
  ],
}
const SERIES_META = {
  meta: {
    id: 'tt0944947',
    videos: [{ season: 1, episode: 1, name: 'Winter Is Coming', released: '2011-04-17' }],
  },
}
const STREAMS = {
  streams: [
    {
      name: 'Comet 1080p',
      description: 'file.mkv',
      infoHash: 'deadbeef',
      sources: ['tracker:udp://t/announce'],
    },
    { name: '[RD+] 2160p', description: 'file.mkv', url: 'https://comet/playback/T/0' },
  ],
}

function mockFetch(routes: Record<string, { ok?: boolean; json?: unknown }>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((k) => url.includes(k))
      const route = key ? routes[key]! : { ok: false }
      const ok = route.ok ?? true
      return {
        ok,
        status: ok ? 200 : 404,
        json: vi.fn().mockResolvedValue(route.json ?? {}),
      }
    })
  )
}

describe('stremio backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore({
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      shell: { open: vi.fn().mockResolvedValue(undefined) },
      settings: { read: vi.fn().mockResolvedValue(null) },
      storage: {
        read: vi.fn().mockResolvedValue(null),
        write: vi.fn().mockResolvedValue(undefined),
      },
    }))
    mockFetch({
      'catalog/movie': { json: MOVIE_SEARCH },
      'catalog/series': { json: SERIES_SEARCH },
      'meta/series': { json: SERIES_META },
      'stream/': { json: STREAMS },
    })
    register(core)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'stremio' })
  })

  describe('searchMeta', () => {
    it('returns [] and skips fetch for an empty query', async () => {
      expect(await handlers.searchMeta!({ query: '  ' })).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })

    it('merges movie and series results', async () => {
      const out = (await handlers.searchMeta!({ query: 'thrones' })) as MetaResult[]
      expect(out.map((m) => m.id)).toEqual(['tt1375666', 'tt0944947'])
      expect(out[1]).toMatchObject({ type: 'series', name: 'Game of Thrones', year: '2011' })
    })

    it('tolerates one catalog failing', async () => {
      mockFetch({ 'catalog/series': { json: SERIES_SEARCH } }) // movie route → ok:false
      const out = (await handlers.searchMeta!({ query: 'x' })) as MetaResult[]
      expect(out.map((m) => m.id)).toEqual(['tt0944947'])
    })
  })

  describe('getSeriesEpisodes', () => {
    it('returns parsed episodes', async () => {
      const out = (await handlers.getSeriesEpisodes!({ id: 'tt0944947' })) as EpisodeResult[]
      expect(out).toEqual([
        {
          id: 'tt0944947:1:1',
          season: 1,
          episode: 1,
          title: 'Winter Is Coming',
          released: '2011-04-17',
          thumbnail: '',
          overview: '',
        },
      ])
    })
  })

  describe('getStreams', () => {
    it('returns torrent and debrid streams', async () => {
      const out = (await handlers.getStreams!({ type: 'movie', id: 'tt1375666' })) as StreamResult[]
      expect(out).toHaveLength(2)
      expect(out[0]!.kind).toBe('torrent')
      expect(out[0]!.magnet).toContain('urn:btih:deadbeef')
      expect(out[1]!.kind).toBe('debrid')
      expect(out[1]!.url).toBe('https://comet/playback/T/0')
    })
  })

  describe('copyText', () => {
    it('writes to the clipboard', async () => {
      await handlers.copyText!({ text: 'magnet:?xt=urn:btih:abc' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('magnet:?xt=urn:btih:abc')
    })
  })

  describe('openExternal', () => {
    it('opens the url with the system handler', async () => {
      await handlers.openExternal!({ url: 'https://comet/playback/T/0' })
      expect(core.shell.open).toHaveBeenCalledWith('https://comet/playback/T/0')
    })
  })

  describe('getActionSettings', () => {
    it('returns the default priority when unset', async () => {
      const out = (await handlers.getActionSettings!({})) as { enterActionPriority: string[] }
      expect(out.enterActionPriority).toEqual([
        'torrentClient',
        'playStream',
        'copyMagnet',
        'copyLink',
      ])
    })

    it('honours a saved priority, filling gaps', async () => {
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValue([
        'copyLink',
        'playStream',
      ])
      const out = (await handlers.getActionSettings!({})) as { enterActionPriority: string[] }
      expect(out.enterActionPriority).toEqual([
        'copyLink',
        'playStream',
        'torrentClient',
        'copyMagnet',
      ])
    })
  })

  describe('favorites', () => {
    const FAV: MetaResult = {
      id: 'tt1375666',
      type: 'movie',
      name: 'Inception',
      year: '2010',
      poster: 'p',
    }

    it('getFavorites returns the stored, sanitized list', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([FAV, { junk: true }])
      expect(await handlers.getFavorites!({})).toEqual([FAV])
    })

    it('toggleFavorite adds a new title and persists it', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const out = (await handlers.toggleFavorite!({ meta: FAV })) as {
        favorites: MetaResult[]
        isFavorite: boolean
      }
      expect(out).toEqual({ favorites: [FAV], isFavorite: true })
      expect(core.storage.write).toHaveBeenCalledWith('favorites.json', [FAV])
    })

    it('toggleFavorite removes an existing title', async () => {
      ;(core.storage.read as ReturnType<typeof vi.fn>).mockResolvedValue([FAV])
      const out = (await handlers.toggleFavorite!({ meta: FAV })) as {
        favorites: MetaResult[]
        isFavorite: boolean
      }
      expect(out).toEqual({ favorites: [], isFavorite: false })
      expect(core.storage.write).toHaveBeenCalledWith('favorites.json', [])
    })
  })
})
