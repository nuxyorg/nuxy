import { describe, it, expect } from 'vitest'
import {
  resolvePriorityListItems,
  resolvePriorityListOrder,
  normalizePriorityListFields,
  swapPriorityListItems,
} from '../utils/priority-list.ts'
import type { ExtSettingsInfo } from '../types.ts'

describe('resolvePriorityListItems', () => {
  const options = [
    { value: 'torrentClient', label: 'Add via qBittorrent' },
    { value: 'copyMagnet', label: 'Copy Magnet Link' },
    { value: 'downloadTorrent', label: 'Save Torrent File' },
  ]

  it('maps stored order to display labels', () => {
    expect(
      resolvePriorityListItems(['copyMagnet', 'downloadTorrent', 'torrentClient'], options)
    ).toEqual([
      { value: 'copyMagnet', label: 'Copy Magnet Link' },
      { value: 'downloadTorrent', label: 'Save Torrent File' },
      { value: 'torrentClient', label: 'Add via qBittorrent' },
    ])
  })

  it('falls back to schema default when stored order is empty', () => {
    const fallback = ['torrentClient', 'copyMagnet', 'downloadTorrent']
    expect(resolvePriorityListItems([], options, fallback)).toEqual([
      { value: 'torrentClient', label: 'Add via qBittorrent' },
      { value: 'copyMagnet', label: 'Copy Magnet Link' },
      { value: 'downloadTorrent', label: 'Save Torrent File' },
    ])
  })
})

describe('resolvePriorityListOrder', () => {
  it('uses fallback when raw value is an empty array', () => {
    expect(resolvePriorityListOrder([], ['a', 'b'])).toEqual(['a', 'b'])
  })

  it('prefers non-empty raw value over fallback', () => {
    expect(resolvePriorityListOrder(['b', 'a'], ['a', 'b'])).toEqual(['b', 'a'])
  })
})

describe('normalizePriorityListFields', () => {
  const info: ExtSettingsInfo = {
    extId: 'com.nuxy.nyaa',
    name: 'Nyaa',
    schema: {
      fields: [
        {
          key: 'enterActionPriority',
          type: 'priority-list',
          label: 'Enter action priority',
          default: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
          options: [],
        },
      ],
    },
  }

  it('replaces empty priority-list values with schema default', () => {
    expect(normalizePriorityListFields(info, { enterActionPriority: [] })).toEqual({
      enterActionPriority: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
    })
  })

  it('keeps non-empty priority-list values', () => {
    expect(normalizePriorityListFields(info, { enterActionPriority: ['copyMagnet'] })).toEqual({
      enterActionPriority: ['copyMagnet'],
    })
  })
})

describe('swapPriorityListItems', () => {
  it('swaps two adjacent items', () => {
    expect(swapPriorityListItems(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('returns the same array when indexes are invalid', () => {
    expect(swapPriorityListItems(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
    expect(swapPriorityListItems(['a', 'b'], 0, 5)).toEqual(['a', 'b'])
  })
})
