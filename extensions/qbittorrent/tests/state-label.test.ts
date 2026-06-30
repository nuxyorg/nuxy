import { describe, it, expect } from 'vitest'
import {
  normalizeTorrentState,
  isCompletedTorrent,
  resolveDisplayState,
} from '../utils/state-label.ts'

describe('normalizeTorrentState', () => {
  it('passes through known camelCase API states unchanged', () => {
    expect(normalizeTorrentState('downloading')).toBe('downloading')
    expect(normalizeTorrentState('pausedDL')).toBe('pausedDL')
    expect(normalizeTorrentState('stalledUP')).toBe('stalledUP')
  })

  it('normalizes forced download/upload states to their locale keys', () => {
    expect(normalizeTorrentState('forcedDL')).toBe('forcedDL')
    expect(normalizeTorrentState('forcedUP')).toBe('forcedUP')
  })

  it('normalizes checkingResumeData to its locale key', () => {
    expect(normalizeTorrentState('checkingResumeData')).toBe('checkingResumeData')
  })

  it('is case-insensitive for matching against known states', () => {
    expect(normalizeTorrentState('FORCEDDL')).toBe('forcedDL')
    expect(normalizeTorrentState('CheckingResumeData')).toBe('checkingResumeData')
  })

  it('falls back to "unknown" for unrecognized states', () => {
    expect(normalizeTorrentState('somethingNew')).toBe('unknown')
  })
})

describe('isCompletedTorrent', () => {
  it('is true at 100% progress when paused or stopped', () => {
    expect(isCompletedTorrent({ progress: 1, state: 'pausedUP' })).toBe(true)
    expect(isCompletedTorrent({ progress: 1, state: 'pausedDL' })).toBe(true)
    expect(isCompletedTorrent({ progress: 1, state: 'stoppedUP' })).toBe(true)
    expect(isCompletedTorrent({ progress: 1, state: 'stoppedDL' })).toBe(true)
    expect(isCompletedTorrent({ progress: 0.999, state: 'pausedUP' })).toBe(true)
  })

  it('is false when still downloading or actively seeding', () => {
    expect(isCompletedTorrent({ progress: 1, state: 'uploading' })).toBe(false)
    expect(isCompletedTorrent({ progress: 1, state: 'stalledUP' })).toBe(false)
    expect(isCompletedTorrent({ progress: 0.5, state: 'pausedDL' })).toBe(false)
  })
})

describe('resolveDisplayState', () => {
  it('returns completed for finished paused/stopped torrents', () => {
    expect(resolveDisplayState({ progress: 1, state: 'pausedUP' })).toBe('completed')
  })

  it('returns the normalized API state otherwise', () => {
    expect(resolveDisplayState({ progress: 1, state: 'uploading' })).toBe('uploading')
    expect(resolveDisplayState({ progress: 0.5, state: 'pausedDL' })).toBe('pausedDL')
  })
})
