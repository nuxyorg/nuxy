import { describe, it, expect } from 'vitest'
import {
  normalizeAddonBase,
  buildSearchUrl,
  buildStreamUrl,
  buildSeriesMetaUrl,
  parseMetaSearch,
  parseSeriesEpisodes,
  buildMagnet,
  parseStreams,
  mergeByRank,
} from '../utils/stremio-api.ts'

describe('normalizeAddonBase', () => {
  it('strips a trailing /manifest.json', () => {
    expect(normalizeAddonBase('https://comet.elfhosted.com/CONFIG/manifest.json')).toBe(
      'https://comet.elfhosted.com/CONFIG'
    )
  })

  it('strips a trailing slash', () => {
    expect(normalizeAddonBase('https://comet.elfhosted.com/CONFIG/')).toBe(
      'https://comet.elfhosted.com/CONFIG'
    )
  })

  it('leaves a clean base unchanged', () => {
    expect(normalizeAddonBase('https://comet.elfhosted.com/CONFIG')).toBe(
      'https://comet.elfhosted.com/CONFIG'
    )
  })
})

describe('buildSearchUrl', () => {
  it('builds a Cinemeta movie search url with an encoded query', () => {
    expect(buildSearchUrl('https://v3-cinemeta.strem.io', 'movie', 'the matrix')).toBe(
      'https://v3-cinemeta.strem.io/catalog/movie/top/search=the%20matrix.json'
    )
  })

  it('builds a series search url', () => {
    expect(buildSearchUrl('https://v3-cinemeta.strem.io/', 'series', 'dexter')).toBe(
      'https://v3-cinemeta.strem.io/catalog/series/top/search=dexter.json'
    )
  })
})

describe('buildStreamUrl', () => {
  it('builds a movie stream url', () => {
    expect(buildStreamUrl('https://comet.elfhosted.com/CONFIG', 'movie', 'tt1375666')).toBe(
      'https://comet.elfhosted.com/CONFIG/stream/movie/tt1375666.json'
    )
  })

  it('builds a series stream url from an episode id', () => {
    expect(buildStreamUrl('https://comet.elfhosted.com/CONFIG', 'series', 'tt0944947:1:5')).toBe(
      'https://comet.elfhosted.com/CONFIG/stream/series/tt0944947:1:5.json'
    )
  })
})

describe('buildSeriesMetaUrl', () => {
  it('builds a Cinemeta series meta url', () => {
    expect(buildSeriesMetaUrl('https://v3-cinemeta.strem.io', 'tt0944947')).toBe(
      'https://v3-cinemeta.strem.io/meta/series/tt0944947.json'
    )
  })
})

describe('parseMetaSearch', () => {
  it('maps metas, preferring imdb_id and falling back to id', () => {
    const json = {
      metas: [
        {
          id: 'tt1375666',
          imdb_id: 'tt1375666',
          type: 'movie',
          name: 'Inception',
          poster: 'https://img/p.jpg',
          releaseInfo: '2010',
        },
        { id: 'tt0133093', type: 'movie', name: 'The Matrix' },
      ],
    }
    expect(parseMetaSearch(json, 'movie')).toEqual([
      {
        id: 'tt1375666',
        type: 'movie',
        name: 'Inception',
        year: '2010',
        poster: 'https://img/p.jpg',
      },
      { id: 'tt0133093', type: 'movie', name: 'The Matrix', year: '', poster: '' },
    ])
  })

  it('drops entries without a usable tt/kitsu id or name', () => {
    const json = {
      metas: [
        { id: 'someslug', type: 'movie', name: 'Not Indexed' },
        { id: 'tt9', type: 'movie' },
        { id: 'kitsu:42', type: 'series', name: 'Anime Show' },
      ],
    }
    expect(parseMetaSearch(json, 'series')).toEqual([
      { id: 'kitsu:42', type: 'series', name: 'Anime Show', year: '', poster: '' },
    ])
  })

  it('returns [] for malformed input', () => {
    expect(parseMetaSearch(null, 'movie')).toEqual([])
    expect(parseMetaSearch({}, 'movie')).toEqual([])
    expect(parseMetaSearch({ metas: 'nope' }, 'movie')).toEqual([])
  })
})

describe('parseSeriesEpisodes', () => {
  it('maps videos with thumbnail/overview, prefers the API id, and sorts by season/episode', () => {
    const json = {
      meta: {
        id: 'tt0944947',
        videos: [
          {
            id: 'tt0944947:1:2',
            season: 1,
            episode: 2,
            name: 'The Kingsroad',
            firstAired: '2011-04-24T05:00:00.000Z',
            thumbnail: 'https://still/1-2.jpg',
            overview: 'They head south.',
          },
          {
            season: 1,
            episode: 1,
            title: 'Winter Is Coming',
            released: '2011-04-17',
          },
          { season: 0, episode: 1, name: 'Special' },
        ],
      },
    }
    expect(parseSeriesEpisodes(json)).toEqual([
      {
        id: 'tt0944947:1:1',
        season: 1,
        episode: 1,
        title: 'Winter Is Coming',
        released: '2011-04-17',
        thumbnail: '',
        overview: '',
      },
      {
        id: 'tt0944947:1:2',
        season: 1,
        episode: 2,
        title: 'The Kingsroad',
        released: '2011-04-24T05:00:00.000Z',
        thumbnail: 'https://still/1-2.jpg',
        overview: 'They head south.',
      },
    ])
  })

  it('returns [] when there are no videos', () => {
    expect(parseSeriesEpisodes({ meta: {} })).toEqual([])
    expect(parseSeriesEpisodes(null)).toEqual([])
  })
})

describe('mergeByRank', () => {
  it('interleaves two ranked lists round-robin', () => {
    expect(mergeByRank(['m1', 'm2', 'm3'], ['s1', 's2'])).toEqual(['m1', 's1', 'm2', 's2', 'm3'])
  })

  it('handles empty lists', () => {
    expect(mergeByRank([], ['s1'])).toEqual(['s1'])
    expect(mergeByRank(['m1'], [])).toEqual(['m1'])
  })
})

describe('buildMagnet', () => {
  it('builds a magnet with display name and tracker sources', () => {
    const magnet = buildMagnet('ABCDEF', 'Some.Movie.1080p', [
      'tracker:udp://tracker.one:1337/announce',
      'dht:nodehash',
      'tracker:http://tracker.two/announce',
    ])
    expect(magnet).toBe(
      'magnet:?xt=urn:btih:ABCDEF&dn=Some.Movie.1080p' +
        '&tr=udp%3A%2F%2Ftracker.one%3A1337%2Fannounce' +
        '&tr=http%3A%2F%2Ftracker.two%2Fannounce'
    )
  })

  it('omits trackers when sources are absent', () => {
    expect(buildMagnet('ABC', 'name')).toBe('magnet:?xt=urn:btih:ABC&dn=name')
  })
})

describe('parseStreams', () => {
  it('normalizes a torrent stream into a magnet result', () => {
    const json = {
      streams: [
        {
          name: 'Comet 1080p',
          description: 'Movie.1080p.mkv\n💾 8 GB 👤 120',
          infoHash: 'deadbeef',
          fileIdx: 0,
          sources: ['tracker:udp://t.one:1337/announce'],
        },
      ],
    }
    const out = parseStreams(json)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      kind: 'torrent',
      infoHash: 'deadbeef',
      name: 'Comet 1080p',
      description: 'Movie.1080p.mkv\n💾 8 GB 👤 120',
    })
    expect(out[0]!.magnet).toContain('magnet:?xt=urn:btih:deadbeef')
    expect(out[0]!.magnet).toContain('tr=udp%3A%2F%2Ft.one%3A1337%2Fannounce')
    expect(out[0]!.url).toBeUndefined()
  })

  it('normalizes a debrid stream into a url result', () => {
    const json = {
      streams: [
        {
          name: '[RD+] Comet 2160p',
          description: 'Movie.2160p.mkv',
          url: 'https://comet.elfhosted.com/playback/TOKEN/0',
        },
      ],
    }
    const out = parseStreams(json)
    expect(out[0]).toMatchObject({
      kind: 'debrid',
      url: 'https://comet.elfhosted.com/playback/TOKEN/0',
      name: '[RD+] Comet 2160p',
    })
    expect(out[0]!.magnet).toBeUndefined()
  })

  it('assigns stable unique ids and skips unusable streams', () => {
    const json = {
      streams: [
        { name: 'a', infoHash: 'hash1' },
        { name: 'b', url: 'https://x/1' },
        { name: 'c (no source)' },
      ],
    }
    const out = parseStreams(json)
    expect(out.map((s) => s.id)).toEqual(['hash1', 'https://x/1'])
  })

  it('returns [] for malformed input', () => {
    expect(parseStreams(null)).toEqual([])
    expect(parseStreams({ streams: 'nope' })).toEqual([])
  })
})
