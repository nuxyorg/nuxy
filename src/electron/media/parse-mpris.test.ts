import { describe, expect, it } from 'vitest'
import { mprisBusNameToSource, parseMprisPlayer, pickBestMprisPlayer } from './parse-mpris.js'

describe('mprisBusNameToSource', () => {
  it('strips the MPRIS prefix', () => {
    expect(mprisBusNameToSource('org.mpris.MediaPlayer2.spotify')).toBe('spotify')
  })

  it('returns the input unchanged when prefix is missing', () => {
    expect(mprisBusNameToSource('com.example.custom')).toBe('com.example.custom')
  })

  it('handles empty string', () => {
    expect(mprisBusNameToSource('')).toBe('')
  })

  it('handles bus name that IS only the prefix', () => {
    expect(mprisBusNameToSource('org.mpris.MediaPlayer2.')).toBe('')
  })
})

describe('parseMprisPlayer', () => {
  it('maps playing metadata to NowPlaying', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.spotify',
      {
        'xesam:title': { value: 'Track' },
        'xesam:artist': { value: ['Artist A'] },
        'xesam:album': { value: 'Album' },
        'mpris:artUrl': { value: 'https://example.com/cover.jpg' },
      },
      { value: 'Playing' }
    )

    expect(result).toEqual({
      title: 'Track',
      artist: 'Artist A',
      album: 'Album',
      playing: true,
      source: 'spotify',
      artworkUrl: 'https://example.com/cover.jpg',
    })
  })

  it('returns null for Stopped status with no metadata', () => {
    expect(parseMprisPlayer('org.mpris.MediaPlayer2.vlc', {}, { value: 'Stopped' })).toBeNull()
  })

  it('returns null for empty metadata and Stopped status', () => {
    expect(parseMprisPlayer('org.mpris.MediaPlayer2.vlc', {}, 'Stopped')).toBeNull()
  })

  it('marks Paused status as not playing', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.vlc',
      { 'xesam:title': { value: 'Paused Track' } },
      { value: 'Paused' }
    )
    expect(result).not.toBeNull()
    expect(result!.playing).toBe(false)
    expect(result!.title).toBe('Paused Track')
  })

  it('unwraps raw (non-variant) string metadata', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.mpv',
      { 'xesam:title': 'Raw Title', 'xesam:artist': 'Raw Artist' },
      'Playing'
    )
    expect(result!.title).toBe('Raw Title')
    expect(result!.artist).toBe('Raw Artist')
  })

  it('extracts artist from array', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.banshee',
      { 'xesam:artist': ['First', 'Second'] },
      'Playing'
    )
    expect(result!.artist).toBe('First')
  })

  it('falls back to mpris:trackid when xesam:title is missing', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.foo',
      { 'mpris:trackid': { value: '/track/123' } },
      'Playing'
    )
    expect(result!.title).toBe('/track/123')
  })

  it('returns null when Stopped with only whitespace title', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.foo',
      { 'xesam:title': { value: '   ' } },
      'Stopped'
    )
    expect(result).toBeNull()
  })

  it('returns non-null with undefined fields when Playing but metadata is null', () => {
    // null metadata → no title/artist; Playing status alone keeps the result non-null
    const result = parseMprisPlayer('org.mpris.MediaPlayer2.foo', null, 'Playing')
    expect(result).not.toBeNull()
    expect(result!.playing).toBe(true)
    expect(result!.title).toBeUndefined()
  })

  it('artworkUrl is undefined when mpris:artUrl is missing', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.foo',
      { 'xesam:title': { value: 'Song' } },
      'Playing'
    )
    expect(result!.artworkUrl).toBeUndefined()
  })
})

describe('pickBestMprisPlayer', () => {
  it('returns null when all entries have null nowPlaying', () => {
    expect(
      pickBestMprisPlayer([
        { busName: 'a', nowPlaying: null },
        { busName: 'b', nowPlaying: null },
      ])
    ).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(pickBestMprisPlayer([])).toBeNull()
  })

  it('prefers a playing player over paused', () => {
    const picked = pickBestMprisPlayer([
      { busName: 'a', nowPlaying: { title: 'Paused', playing: false, source: 'firefox' } },
      { busName: 'b', nowPlaying: { title: 'Live', playing: true, source: 'spotify' } },
    ])
    expect(picked?.source).toBe('spotify')
    expect(picked?.playing).toBe(true)
  })

  it('returns the paused player when no playing player exists', () => {
    const picked = pickBestMprisPlayer([
      { busName: 'a', nowPlaying: { title: 'Paused', playing: false, source: 'vlc' } },
    ])
    expect(picked?.source).toBe('vlc')
    expect(picked?.playing).toBe(false)
  })

  it('returns first entry when only one player has data', () => {
    const picked = pickBestMprisPlayer([
      { busName: 'a', nowPlaying: null },
      { busName: 'b', nowPlaying: { title: 'T', playing: false, source: 'mpv' } },
    ])
    expect(picked?.source).toBe('mpv')
  })
})
