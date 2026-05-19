import { describe, expect, it } from 'vitest'
import {
  mprisBusNameToSource,
  parseMprisPlayer,
  pickBestMprisPlayer
} from './parse-mpris.js'

describe('mprisBusNameToSource', () => {
  it('strips the MPRIS prefix', () => {
    expect(mprisBusNameToSource('org.mpris.MediaPlayer2.spotify')).toBe(
      'spotify'
    )
  })
})

describe('parseMprisPlayer', () => {
  it('maps metadata and playing status', () => {
    const result = parseMprisPlayer(
      'org.mpris.MediaPlayer2.spotify',
      {
        'xesam:title': { value: 'Track' },
        'xesam:artist': { value: ['Artist A'] },
        'xesam:album': { value: 'Album' },
        'mpris:artUrl': { value: 'https://example.com/cover.jpg' }
      },
      { value: 'Playing' }
    )

    expect(result).toEqual({
      title: 'Track',
      artist: 'Artist A',
      album: 'Album',
      playing: true,
      source: 'spotify',
      artworkUrl: 'https://example.com/cover.jpg'
    })
  })

  it('returns null for stopped with no metadata', () => {
    expect(
      parseMprisPlayer(
        'org.mpris.MediaPlayer2.vlc',
        {},
        { value: 'Stopped' }
      )
    ).toBeNull()
  })
})

describe('pickBestMprisPlayer', () => {
  it('prefers a playing player', () => {
    const picked = pickBestMprisPlayer([
      {
        busName: 'org.mpris.MediaPlayer2.firefox',
        nowPlaying: {
          title: 'Paused',
          playing: false,
          source: 'firefox'
        }
      },
      {
        busName: 'org.mpris.MediaPlayer2.spotify',
        nowPlaying: {
          title: 'Live',
          playing: true,
          source: 'spotify'
        }
      }
    ])

    expect(picked?.source).toBe('spotify')
    expect(picked?.playing).toBe(true)
  })
})
