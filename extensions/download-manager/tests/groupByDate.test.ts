import { describe, it, expect } from 'vitest'
import { groupDownloadsByDate } from '../utils/groupByDate.ts'
import type { DownloadItem } from '../types.ts'

const t = (key: string) => key

function makeItem(id: string, createdAt: string): DownloadItem {
  return {
    id,
    url: `https://example.com/${id}`,
    fileName: `${id}.iso`,
    filePath: `/home/user/Downloads/${id}.iso`,
    status: 'completed',
    bytesDownloaded: 0,
    totalBytes: null,
    speedBps: 0,
    error: null,
    createdAt,
    updatedAt: createdAt,
  }
}

describe('groupDownloadsByDate', () => {
  const now = new Date('2026-06-20T12:00:00.000Z')

  it('buckets items into today, yesterday, last week, last month, and older', () => {
    const items = [
      makeItem('today', '2026-06-20T08:00:00.000Z'),
      makeItem('yesterday', '2026-06-19T08:00:00.000Z'),
      makeItem('lastWeek', '2026-06-15T08:00:00.000Z'),
      makeItem('lastMonth', '2026-06-01T08:00:00.000Z'),
      makeItem('older', '2026-01-01T08:00:00.000Z'),
    ]

    const groups = groupDownloadsByDate(items, t, now)

    expect(groups.map((g) => g.label)).toEqual([
      'date.today',
      'date.yesterday',
      'date.lastWeek',
      'date.lastMonth',
      'date.older',
    ])
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([
      ['today'],
      ['yesterday'],
      ['lastWeek'],
      ['lastMonth'],
      ['older'],
    ])
  })

  it('omits empty buckets', () => {
    const items = [makeItem('today', '2026-06-20T08:00:00.000Z')]
    const groups = groupDownloadsByDate(items, t, now)
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('date.today')
  })

  it('returns no groups for an empty list', () => {
    expect(groupDownloadsByDate([], t, now)).toEqual([])
  })
})
