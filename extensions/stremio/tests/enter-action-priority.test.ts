import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ENTER_ACTION_PRIORITY,
  normalizeEnterActionPriority,
  resolveEffectiveActions,
} from '../utils/enter-action-priority.ts'

describe('normalizeEnterActionPriority', () => {
  it('returns the default order when input is missing or malformed', () => {
    expect(normalizeEnterActionPriority(undefined)).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
    expect(normalizeEnterActionPriority('nope')).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
    expect(normalizeEnterActionPriority([])).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
  })

  it('keeps a valid saved order and appends any missing actions', () => {
    expect(normalizeEnterActionPriority(['copyMagnet', 'torrentClient'])).toEqual([
      'copyMagnet',
      'torrentClient',
      'playStream',
      'copyLink',
    ])
  })

  it('drops unknown and duplicate entries', () => {
    expect(normalizeEnterActionPriority(['copyLink', 'bogus', 'copyLink', 'playStream'])).toEqual([
      'copyLink',
      'playStream',
      'torrentClient',
      'copyMagnet',
    ])
  })
})

describe('resolveEffectiveActions', () => {
  it('for a torrent stream with a ready client prefers torrentClient then copyMagnet', () => {
    expect(
      resolveEffectiveActions(DEFAULT_ENTER_ACTION_PRIORITY, {
        kind: 'torrent',
        torrentClientReady: true,
      })
    ).toEqual({ enter: 'torrentClient', shiftEnter: 'copyMagnet' })
  })

  it('for a torrent stream without a ready client falls back to copyMagnet', () => {
    expect(
      resolveEffectiveActions(DEFAULT_ENTER_ACTION_PRIORITY, {
        kind: 'torrent',
        torrentClientReady: false,
      })
    ).toEqual({ enter: 'copyMagnet', shiftEnter: null })
  })

  it('for a debrid stream only exposes play/copy-link actions', () => {
    expect(
      resolveEffectiveActions(DEFAULT_ENTER_ACTION_PRIORITY, {
        kind: 'debrid',
        torrentClientReady: true,
      })
    ).toEqual({ enter: 'playStream', shiftEnter: 'copyLink' })
  })

  it('returns no actions when nothing applies', () => {
    expect(
      resolveEffectiveActions(['torrentClient'], { kind: 'debrid', torrentClientReady: true })
    ).toEqual({ enter: null, shiftEnter: null })
  })
})
