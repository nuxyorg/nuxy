import { describe, it, expect } from 'vitest'
import { filterFormats, getFormatBadge, fmtSize } from '../utils/format.ts'
import type { VideoFormat } from '../types.ts'

const formats: VideoFormat[] = [
  {
    formatId: '137',
    ext: 'mp4',
    resolution: '640x360',
    filesize: 1024 * 1024,
    note: 'SD',
    vcodec: 'avc1',
    acodec: 'none',
  },
  {
    formatId: '140',
    ext: 'm4a',
    resolution: 'audio only',
    filesize: 512 * 1024,
    note: 'audio',
    vcodec: 'none',
    acodec: 'mp4a',
  },
]

describe('filterFormats', () => {
  it('recommended includes synthetic best-quality and best-audio entries', () => {
    const result = filterFormats(formats, 'recommended')
    expect(result.some((f) => f.formatId === 'bestvideo+bestaudio/best')).toBe(true)
    expect(result.some((f) => f.formatId === 'bestaudio[ext=m4a]/bestaudio/best')).toBe(true)
  })

  it('audio_only keeps only formats with no video codec', () => {
    const result = filterFormats(formats, 'audio_only')
    expect(result).toHaveLength(1)
    expect(result[0].formatId).toBe('140')
  })

  it('video_only keeps formats with video but no audio', () => {
    const result = filterFormats(formats, 'video_only')
    expect(result).toHaveLength(1)
    expect(result[0].formatId).toBe('137')
  })

  it('all returns every format unchanged', () => {
    expect(filterFormats(formats, 'all')).toEqual(formats)
  })
})

describe('getFormatBadge', () => {
  it('flags audio-only formats', () => {
    expect(getFormatBadge(formats[1])).toEqual({ variant: 'warning', text: 'AUDIO' })
  })

  it('flags silent video-only formats', () => {
    expect(getFormatBadge(formats[0])).toEqual({ variant: 'danger', text: 'SILENT' })
  })
})

describe('fmtSize', () => {
  it('formats sub-MB sizes in KB', () => {
    expect(fmtSize(512 * 1024)).toBe('512.0 KB')
  })

  it('formats null as unknown', () => {
    expect(fmtSize(null)).toBe('?')
  })
})
