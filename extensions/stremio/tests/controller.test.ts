import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setOmniBarPortal: vi.fn(),
      setSearchPlaceholder: vi.fn(),
      returnToShell: vi.fn(),
      controlOmniBar: vi.fn(),
    },
    window: { hide: vi.fn() },
    deeplink: { dispatch: vi.fn(async () => ({ ok: true })) },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations } from '@nuxyorg/core'
import { StremioController } from '../controller.ts'
import enLocale from '../locales/en.json'
import type { MetaResult, EpisodeResult, StreamResult } from '../types.ts'

const enTranslations = flattenTranslations(enLocale)

const MOVIE: MetaResult = {
  id: 'tt1375666',
  type: 'movie',
  name: 'Inception',
  year: '2010',
  poster: '',
}
const SERIES: MetaResult = {
  id: 'tt0944947',
  type: 'series',
  name: 'GoT',
  year: '2011',
  poster: '',
}
const EPISODE: EpisodeResult = {
  id: 'tt0944947:1:1',
  season: 1,
  episode: 1,
  title: 'Winter Is Coming',
  released: '2011-04-17',
  thumbnail: '',
  overview: '',
}
const EPISODE_2: EpisodeResult = {
  id: 'tt0944947:1:2',
  season: 1,
  episode: 2,
  title: 'The Kingsroad',
  released: '2011-04-24',
  thumbnail: '',
  overview: '',
}
const TORRENT_STREAM: StreamResult = {
  id: 'hash1',
  kind: 'torrent',
  name: 'Comet 1080p',
  description: 'file.mkv',
  infoHash: 'hash1',
  magnet: 'magnet:?xt=urn:btih:hash1&dn=file',
}
const DEBRID_STREAM: StreamResult = {
  id: 'https://x/1',
  kind: 'debrid',
  name: '[RD+] 2160p',
  description: 'file.mkv',
  url: 'https://x/1',
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('StremioController', () => {
  let getter: (() => ReturnType<StremioController['getKeyActions']>) | null = null
  let streamsData: StreamResult[] = [TORRENT_STREAM]
  let favoritesData: MetaResult[] = []
  let toggleResult: { favorites: MetaResult[]; isFavorite: boolean } = {
    favorites: [],
    isFavorite: false,
  }

  beforeEach(() => {
    getter = null
    streamsData = [TORRENT_STREAM]
    favoritesData = []
    toggleResult = { favorites: [], isFavorite: false }
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      switch (channel) {
        case 'getExtensionTranslations':
          return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
        case 'getActionSettings':
          return {
            success: true,
            data: {
              enterActionPriority: ['torrentClient', 'playStream', 'copyMagnet', 'copyLink'],
            },
          }
        case 'getStatus':
          return { success: true, data: { state: 'ready' } }
        case 'getSeriesEpisodes':
          return { success: true, data: [EPISODE] }
        case 'getStreams':
          return { success: true, data: streamsData }
        case 'getFavorites':
          return { success: true, data: favoritesData }
        case 'toggleFavorite':
          return { success: true, data: toggleResult }
        case 'searchMeta':
          return { success: true, data: [SERIES] }
        default:
          return { success: true, data: undefined }
      }
    })
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
  })

  afterEach(() => vi.restoreAllMocks())

  async function connected(): Promise<StremioController> {
    const c = new StremioController(() => {})
    c.connect()
    await flush() // resolve initial action-settings + torrent-client poll
    return c
  }

  it('drills a movie straight into the streams view', async () => {
    const c = await connected()
    c.store.setState({
      query: 'inception',
      metaQuery: 'inception',
      metas: [MOVIE],
      view: 'meta',
      selectedIndex: 0,
    })

    c.openSelected()
    await flush()

    expect(c.state.view).toBe('streams')
    expect(c.state.streams).toEqual([TORRENT_STREAM])
    // drilling in auto-selects the first result so Enter is immediately usable
    expect(c.state.selectedIndex).toBe(0)
    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.stremio',
      'getStreams',
      { type: 'movie', id: 'tt1375666' },
      expect.anything()
    )
    c.disconnect()
  })

  it('drills a series into episodes, then an episode into streams', async () => {
    const c = await connected()
    c.store.setState({
      query: 'got',
      metaQuery: 'got',
      metas: [SERIES],
      view: 'meta',
      selectedIndex: 0,
    })

    c.openSelected()
    await flush()
    expect(c.state.view).toBe('episodes')
    expect(c.state.episodes).toEqual([EPISODE])
    expect(c.state.selectedIndex).toBe(0) // auto-selected

    c.openSelected()
    await flush()
    expect(c.state.view).toBe('streams')
    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.stremio',
      'getStreams',
      { type: 'series', id: 'tt0944947:1:1' },
      expect.anything()
    )
    c.disconnect()
  })

  it('Escape returns from streams to meta for a movie', async () => {
    const c = await connected()
    c.store.setState({
      query: 'inception',
      metaQuery: 'inception',
      metas: [MOVIE],
      view: 'meta',
      selectedIndex: 0,
    })
    c.openSelected()
    await flush()

    const back = getter!().find((a) => a.id === 'stremio-back')
    expect(back?.activeOn?.()).toBe(true)
    back?.handler?.()
    expect(c.state.view).toBe('meta')
    expect(c.state.selectedMeta).toBeNull()
    c.disconnect()
  })

  it('back is inactive on the meta view', async () => {
    const c = await connected()
    const back = getter!().find((a) => a.id === 'stremio-back')
    expect(back?.activeOn?.()).toBe(false)
    c.disconnect()
  })

  it('on a torrent stream with a ready client, Enter hands off to qBittorrent', async () => {
    const c = await connected()
    c.store.setState({ view: 'streams', streams: [TORRENT_STREAM], selectedIndex: 0 })
    await flush()
    expect(c.state.torrentClientReady).toBe(true)

    const enter = getter!().find((a) => a.id === 'stremio-enter')
    expect(enter?.label).toBe('Add via qBittorrent')
    enter?.handler?.()
    await flush()
    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith(
      expect.stringContaining('nuxy://qbittorrent/add?url=')
    )
    c.disconnect()
  })

  it('on a debrid stream, Enter is Open/Play and Shift+Enter is Copy Link', async () => {
    const c = await connected()
    c.store.setState({ view: 'streams', streams: [DEBRID_STREAM], selectedIndex: 0 })

    const actions = getter!()
    expect(actions.find((a) => a.id === 'stremio-enter')?.label).toBe('Open / Play')
    expect(actions.find((a) => a.id === 'stremio-shift-enter')?.label).toBe('Copy Link')

    actions.find((a) => a.id === 'stremio-enter')?.handler?.()
    await flush()
    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.stremio',
      'openExternal',
      { url: 'https://x/1' },
      expect.anything()
    )
    c.disconnect()
  })

  it('the meta view delegates arrow navigation to the grid (no controller navigator)', async () => {
    const c = await connected()
    c.store.setState({
      query: 'x',
      metaQuery: 'x',
      metas: [MOVIE, SERIES],
      view: 'meta',
      selectedIndex: 0,
    })
    expect(getter!().find((a) => a.id === 'stremio-navigate')).toBeUndefined()
    c.disconnect()
  })

  it('list views keep a controller navigator that clamps within the list', async () => {
    const c = await connected()
    c.store.setState({
      view: 'streams',
      streams: [TORRENT_STREAM, DEBRID_STREAM],
      selectedIndex: -1,
    })
    const nav = getter!().find((a) => a.id === 'stremio-navigate')!
    const down = nav.children!.find((child) => child.id === 'stremio-navigate-pos')!

    down.handler?.() // → 0
    down.handler?.() // → 1
    down.handler?.() // → clamped at 1
    expect(c.state.selectedIndex).toBe(1)
    c.disconnect()
  })

  it('filters episodes locally in the episodes view instead of running a meta search', async () => {
    const c = await connected()
    c.store.setState({
      view: 'episodes',
      metaQuery: 'got',
      episodes: [EPISODE, EPISODE_2],
      selectedIndex: 0,
    })

    c.setQuery('winter')

    expect(c.state.view).toBe('episodes')
    expect(c.state.metaQuery).toBe('got')
    expect(c.filteredEpisodes).toEqual([EPISODE])
    expect(c.state.selectedIndex).toBe(-1)
    expect(window.core!.ipc!.invoke).not.toHaveBeenCalledWith(
      'com.nuxy.stremio',
      'searchMeta',
      expect.anything(),
      expect.anything()
    )
    c.disconnect()
  })

  it('still runs a full meta search when querying from the meta view', async () => {
    const c = await connected()
    vi.useFakeTimers()
    try {
      c.setQuery('got')
      await vi.advanceTimersByTimeAsync(1000)

      expect(c.state.view).toBe('meta')
      expect(c.state.metaQuery).toBe('got')
      expect(c.state.metas).toEqual([SERIES])
      expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
        'com.nuxy.stremio',
        'searchMeta',
        { query: 'got' },
        expect.anything()
      )
      c.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

  describe('favorites', () => {
    it('loads favorites on connect and shows them on the home screen', async () => {
      favoritesData = [MOVIE]
      const c = await connected()
      expect(c.state.favorites).toEqual([MOVIE])
      // query is empty → the meta list is the favorites list
      expect(c.currentMetaList()).toEqual([MOVIE])
      c.disconnect()
    })

    it('Ctrl+F toggles the selected title and updates favorites', async () => {
      const c = await connected()
      c.store.setState({
        query: 'inception',
        metaQuery: 'inception',
        metas: [MOVIE],
        view: 'meta',
        selectedIndex: 0,
      })
      toggleResult = { favorites: [MOVIE], isFavorite: true }

      const fav = getter!().find((a) => a.id === 'stremio-favorite')!
      expect(fav.label).toBe('Favorite')
      expect(fav.activeOn?.()).toBe(true)
      fav.handler?.()
      await flush()

      expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
        'com.nuxy.stremio',
        'toggleFavorite',
        { meta: MOVIE },
        expect.anything()
      )
      expect(c.state.favorites).toEqual([MOVIE])
      // label flips once the item is favorited
      expect(getter!().find((a) => a.id === 'stremio-favorite')?.label).toBe('Unfavorite')
      c.disconnect()
    })

    it('favorite action is inactive when nothing is selected', async () => {
      const c = await connected()
      c.store.setState({
        query: 'inception',
        metaQuery: 'inception',
        metas: [MOVIE],
        view: 'meta',
        selectedIndex: -1,
      })
      expect(
        getter!()
          .find((a) => a.id === 'stremio-favorite')
          ?.activeOn?.()
      ).toBe(false)
      c.disconnect()
    })
  })
})
