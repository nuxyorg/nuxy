import { describe, it, expect } from 'vitest'
import { isTechnicalErrorMessage, mapVideoDownloaderError } from '../utils/map-error.ts'

const t = (key: string) => key

describe('mapVideoDownloaderError', () => {
  it('maps null property access to fetchFailed', () => {
    expect(
      mapVideoDownloaderError(new Error("Cannot read properties of null (reading 'title')"), t)
    ).toBe('errors.fetchFailed')
  })

  it('maps yt-dlp missing errors to install.notInstalled', () => {
    expect(
      mapVideoDownloaderError(
        new Error('yt-dlp is not installed. Install it with: pip install yt-dlp'),
        t
      )
    ).toBe('install.notInstalled')
    expect(mapVideoDownloaderError(new Error('spawn yt-dlp ENOENT'), t)).toBe(
      'install.notInstalled'
    )
  })

  it('does not map unrelated ENOENT errors to install.notInstalled', () => {
    expect(mapVideoDownloaderError(new Error('ENOENT: no such file or directory, mkdir'), t)).toBe(
      'ENOENT: no such file or directory, mkdir'
    )
  })

  it('passes through already user-facing messages', () => {
    expect(mapVideoDownloaderError(new Error('Video is private'), t)).toBe('Video is private')
  })

  it('returns generic for non-Error values', () => {
    expect(mapVideoDownloaderError('boom', t)).toBe('errors.generic')
  })
})

describe('isTechnicalErrorMessage', () => {
  it('detects JSON parse failures', () => {
    expect(isTechnicalErrorMessage('Unexpected end of JSON input')).toBe(true)
  })
})
