import { describe, it, expect } from 'vitest'
import {
  normalizeEnterAction,
  STATIC_ENTER_ACTION_OPTIONS,
  ENTER_ACTION_TORRENT_CLIENT,
} from '../utils/enter-action-options.ts'

describe('STATIC_ENTER_ACTION_OPTIONS', () => {
  it('includes copyMagnet, downloadTorrent, and torrentClient', () => {
    expect(STATIC_ENTER_ACTION_OPTIONS.map((o) => o.value)).toEqual([
      'copyMagnet',
      'downloadTorrent',
      'torrentClient',
    ])
  })
})

describe('normalizeEnterAction', () => {
  it('falls back to copyMagnet when saved value is not a recognized action', () => {
    expect(normalizeEnterAction('bogus', STATIC_ENTER_ACTION_OPTIONS)).toBe('copyMagnet')
  })

  it('keeps a saved action that is statically available', () => {
    expect(normalizeEnterAction('downloadTorrent', STATIC_ENTER_ACTION_OPTIONS)).toBe(
      'downloadTorrent'
    )
  })

  it('keeps torrentClient as a first-class enter action', () => {
    expect(normalizeEnterAction(ENTER_ACTION_TORRENT_CLIENT, STATIC_ENTER_ACTION_OPTIONS)).toBe(
      ENTER_ACTION_TORRENT_CLIENT
    )
  })
})
