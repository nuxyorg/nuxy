import type { TranslateFn } from '@nuxyorg/extension-sdk'
import type { DownloadItem } from '../types.ts'

export interface DownloadGroup {
  label: string
  items: DownloadItem[]
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

type BucketKey = 'today' | 'yesterday' | 'lastWeek' | 'lastMonth' | 'older'

const BUCKET_ORDER: Array<[BucketKey, string]> = [
  ['today', 'date.today'],
  ['yesterday', 'date.yesterday'],
  ['lastWeek', 'date.lastWeek'],
  ['lastMonth', 'date.lastMonth'],
  ['older', 'date.older'],
]

export function groupDownloadsByDate(
  items: DownloadItem[],
  t: TranslateFn,
  now: Date = new Date()
): DownloadGroup[] {
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setDate(today.getDate() - 30)

  const buckets: Record<BucketKey, DownloadItem[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  }

  for (const item of items) {
    const created = startOfDay(new Date(item.createdAt))
    if (created.getTime() === today.getTime()) buckets.today.push(item)
    else if (created.getTime() === yesterday.getTime()) buckets.yesterday.push(item)
    else if (created.getTime() > weekAgo.getTime()) buckets.lastWeek.push(item)
    else if (created.getTime() > monthAgo.getTime()) buckets.lastMonth.push(item)
    else buckets.older.push(item)
  }

  return BUCKET_ORDER.filter(([key]) => buckets[key].length > 0).map(([key, labelKey]) => ({
    label: t(labelKey),
    items: buckets[key],
  }))
}
