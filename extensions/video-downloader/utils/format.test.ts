import { describe, it, expect } from 'vitest'
import {
  fmtSize,
  fmtDuration,
  truncate,
  getResolutionHeight,
  getVideoAndAudioFormats,
  getRecommendedFormats,
  filterFormats,
  buildCombinedList,
  getFormatBadge,
  getDownloadBadge,
} from './format.ts'
import type { VideoFormat, DownloadJobPublic, HistoryItem } from '../types.ts'

const mkFormat = (overrides: Partial<VideoFormat> = {}): VideoFormat => ({
  formatId: 'test',
  ext: 'mp4',
  resolution: '1280x720',
  filesize: null,
  note: '',
  ...overrides,
})

describe('fmtSize', () => {
  it('returns ? for falsy input', () => {
    expect(fmtSize(null)).toBe('?')
    expect(fmtSize(0)).toBe('?')
  })

  it('formats bytes under 1 MB as KB', () => {
    expect(fmtSize(512 * 1024)).toBe('512.0 KB')
  })

  it('formats bytes >= 1 MB as MB', () => {
    expect(fmtSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('fmtDuration', () => {
  it('returns empty string for null', () => {
    expect(fmtDuration(null)).toBe('')
  })

  it('formats seconds under an hour as mm:ss', () => {
    expect(fmtDuration(90)).toBe('1:30')
  })

  it('pads seconds correctly', () => {
    expect(fmtDuration(65)).toBe('1:05')
  })

  it('formats hours when >= 3600s', () => {
    expect(fmtDuration(3661)).toBe('1:01:01')
  })

  it('formats exact minute boundary', () => {
    expect(fmtDuration(60)).toBe('1:00')
  })
})

describe('truncate', () => {
  it('leaves short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates to max and appends ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…')
  })

  it('uses default max of 50', () => {
    const long = 'a'.repeat(55)
    expect(truncate(long)).toHaveLength(50)
    expect(truncate(long).endsWith('…')).toBe(true)
  })
})

describe('getResolutionHeight', () => {
  it('parses NxM format', () => {
    expect(getResolutionHeight('1920x1080')).toBe(1080)
  })

  it('parses Np format', () => {
    expect(getResolutionHeight('720p')).toBe(720)
  })

  it('returns 0 for unrecognised strings', () => {
    expect(getResolutionHeight('audio only')).toBe(0)
    expect(getResolutionHeight('Best Quality')).toBe(0)
  })
})

describe('getVideoAndAudioFormats', () => {
  it('excludes video-only streams from merged list', () => {
    const formats: VideoFormat[] = [
      mkFormat({ formatId: 'v1', vcodec: 'avc1', acodec: 'mp4a', resolution: '1280x720' }),
      mkFormat({ formatId: 'a1', vcodec: 'none', acodec: 'mp4a', resolution: 'audio only' }),
    ]
    const result = getVideoAndAudioFormats(formats)
    expect(result.map((f) => f.formatId)).not.toContain('a1')
  })

  it('merges video-without-audio with bestaudio/best', () => {
    const formats: VideoFormat[] = [
      mkFormat({ formatId: 'v2', vcodec: 'avc1', acodec: 'none', resolution: '1920x1080' }),
    ]
    const result = getVideoAndAudioFormats(formats)
    expect(result[0].formatId).toBe('v2+bestaudio/best')
  })

  it('sorts by resolution height descending', () => {
    const formats: VideoFormat[] = [
      mkFormat({ formatId: 'low', vcodec: 'avc1', acodec: 'mp4a', resolution: '640x360' }),
      mkFormat({ formatId: 'high', vcodec: 'avc1', acodec: 'mp4a', resolution: '1920x1080' }),
    ]
    const result = getVideoAndAudioFormats(formats)
    expect(result[0].formatId).toBe('high')
  })
})

describe('getRecommendedFormats', () => {
  it('always includes best quality and best audio entries', () => {
    const result = getRecommendedFormats([])
    expect(result[0].formatId).toBe('bestvideo+bestaudio/best')
    expect(result[1].formatId).toBe('bestaudio[ext=m4a]/bestaudio/best')
  })

  it('adds recognised height tiers from formats', () => {
    const formats: VideoFormat[] = [
      mkFormat({ formatId: 'f1080', vcodec: 'avc1', acodec: 'mp4a', resolution: '1920x1080' }),
      mkFormat({ formatId: 'f720', vcodec: 'avc1', acodec: 'mp4a', resolution: '1280x720' }),
    ]
    const result = getRecommendedFormats(formats)
    const heights = result.map((f) => getResolutionHeight(f.resolution))
    expect(heights).toContain(1080)
    expect(heights).toContain(720)
  })

  it('does not add duplicate heights', () => {
    const formats: VideoFormat[] = [
      mkFormat({
        formatId: 'f1080a',
        vcodec: 'avc1',
        acodec: 'mp4a',
        resolution: '1920x1080',
        tbr: 5000,
      }),
      mkFormat({
        formatId: 'f1080b',
        vcodec: 'avc1',
        acodec: 'mp4a',
        resolution: '1920x1080',
        tbr: 3000,
      }),
    ]
    const result = getRecommendedFormats(formats)
    const count1080 = result.filter((f) => getResolutionHeight(f.resolution) === 1080).length
    expect(count1080).toBe(1)
  })
})

describe('filterFormats', () => {
  const formats: VideoFormat[] = [
    mkFormat({ formatId: 'va', vcodec: 'avc1', acodec: 'mp4a', resolution: '1280x720' }),
    mkFormat({ formatId: 'ao', vcodec: 'none', acodec: 'mp4a', resolution: 'audio only' }),
    mkFormat({ formatId: 'vo', vcodec: 'avc1', acodec: 'none', resolution: '1280x720' }),
  ]

  it('audio_only returns only audio streams', () => {
    const result = filterFormats(formats, 'audio_only')
    expect(result.every((f) => f.vcodec === 'none' || f.resolution === 'audio only')).toBe(true)
  })

  it('video_only returns only video-without-audio streams', () => {
    const result = filterFormats(formats, 'video_only')
    expect(result.every((f) => f.vcodec !== 'none' && f.acodec === 'none')).toBe(true)
  })

  it('all returns all formats unchanged', () => {
    expect(filterFormats(formats, 'all')).toEqual(formats)
  })
})

describe('buildCombinedList', () => {
  const job: DownloadJobPublic = {
    jobId: 'job1',
    url: 'https://example.com/v',
    formatId: 'bestvideo+bestaudio/best',
    progress: 50,
    status: 'running',
    resolution: '1080p',
    metadata: { title: 'Test Video', thumbnail: null, duration: 120, uploader: 'User' },
  }

  const histItem: HistoryItem = {
    id: 'h1',
    url: 'https://example.com/old',
    title: 'Old Video',
    thumbnail: null,
    duration: 60,
    uploader: 'User',
    formatId: 'bestaudio/best',
    resolution: 'audio only',
    outputPath: '/downloads/old.m4a',
    timestamp: Date.now() - 10000,
  }

  it('includes active jobs', () => {
    const result = buildCombinedList([job], [])
    expect(result).toHaveLength(1)
    expect(result[0].jobId).toBe('job1')
    expect(result[0].status).toBe('running')
  })

  it('includes history items not already in jobs', () => {
    const result = buildCombinedList([], [histItem])
    expect(result).toHaveLength(1)
    expect(result[0].jobId).toBe('h1')
    expect(result[0].status).toBe('done')
  })

  it('deduplicates: history item already in jobs is skipped', () => {
    const dedupJob: DownloadJobPublic = { ...job, jobId: 'h1' }
    const result = buildCombinedList([dedupJob], [histItem])
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('running')
  })

  it('sorts running jobs before history', () => {
    const result = buildCombinedList([job], [histItem])
    expect(result[0].status).toBe('running')
  })

  it('marks history items without outputPath as error', () => {
    const errItem: HistoryItem = { ...histItem, id: 'h2', outputPath: null }
    const result = buildCombinedList([], [errItem])
    expect(result[0].status).toBe('error')
    expect(result[0].progress).toBe(0)
  })
})

describe('getFormatBadge', () => {
  it('marks audio-only formats with AUDIO warning badge', () => {
    const f = mkFormat({ vcodec: 'none', acodec: 'mp4a', ext: 'm4a', resolution: 'audio only' })
    const { variant, text } = getFormatBadge(f)
    expect(variant).toBe('warning')
    expect(text).toBe('AUDIO')
  })

  it('marks 1080p and higher with success badge', () => {
    const f = mkFormat({ vcodec: 'avc1', acodec: 'mp4a', ext: 'mp4', resolution: '1920x1080' })
    expect(getFormatBadge(f).variant).toBe('success')
  })

  it('marks silent video-only streams with SILENT danger badge', () => {
    const f = mkFormat({ vcodec: 'avc1', acodec: 'none', ext: 'mp4', resolution: '640x360' })
    const { variant, text } = getFormatBadge(f)
    expect(variant).toBe('danger')
    expect(text).toBe('SILENT')
  })

  it('returns ext text as uppercase for normal streams', () => {
    const f = mkFormat({ vcodec: 'avc1', acodec: 'mp4a', ext: 'webm', resolution: '640x360' })
    expect(getFormatBadge(f).text).toBe('WEBM')
  })
})

describe('getDownloadBadge', () => {
  const base: CombinedListItem = {
    jobId: 'j1',
    url: '',
    formatId: 'f',
    progress: 0,
    status: 'done',
    title: 'T',
    thumbnail: null,
    duration: null,
    uploader: null,
    resolution: '1080p',
    outputPath: null,
    timestamp: 0,
  }

  it('running → primary badge with percentage', () => {
    const { variant, text } = getDownloadBadge({ ...base, status: 'running', progress: 42.5 })
    expect(variant).toBe('primary')
    expect(text).toBe('Downloading (42.5%)')
  })

  it('done → success badge with resolution', () => {
    const { variant, text } = getDownloadBadge({ ...base, status: 'done', resolution: '720p' })
    expect(variant).toBe('success')
    expect(text).toBe('720p')
  })

  it('error → danger badge with ERROR text', () => {
    const { variant, text } = getDownloadBadge({ ...base, status: 'error' })
    expect(variant).toBe('danger')
    expect(text).toBe('ERROR')
  })
})
