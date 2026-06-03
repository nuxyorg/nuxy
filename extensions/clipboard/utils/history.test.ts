import { describe, it, expect } from 'vitest'
import { sortHistory, createHistoryItem } from './history.ts'
import type { ClipboardItem } from '../types.ts'

function item(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: Math.random().toString(36).slice(2),
    text: 'hello',
    image: null,
    copiedAt: new Date().toISOString(),
    pinned: false,
    ...overrides,
  }
}

describe('sortHistory', () => {
  it('pinned items appear before unpinned', () => {
    const input = [
      item({ id: 'a', pinned: false }),
      item({ id: 'b', pinned: true }),
      item({ id: 'c', pinned: false }),
    ]
    const result = sortHistory(input)
    expect(result[0].pinned).toBe(true)
    expect(result[0].id).toBe('b')
    const firstUnpinned = result.findIndex((i) => !i.pinned)
    const lastPinned = result.map((i) => i.pinned).lastIndexOf(true)
    expect(lastPinned).toBeLessThan(firstUnpinned)
  })

  it('within unpinned group, most recently copied comes first', () => {
    const older = new Date(Date.now() - 60000).toISOString()
    const newer = new Date(Date.now() - 1000).toISOString()
    const input = [item({ id: 'old', copiedAt: older }), item({ id: 'new', copiedAt: newer })]
    const result = sortHistory(input)
    expect(result[0].id).toBe('new')
  })

  it('does not mutate the original array', () => {
    const original = [item({ id: 'a' }), item({ id: 'b', pinned: true })]
    const copy = [...original]
    sortHistory(original)
    expect(original[0].id).toBe(copy[0].id)
    expect(original[1].id).toBe(copy[1].id)
  })

  it('empty array returns empty array', () => {
    expect(sortHistory([])).toEqual([])
  })
})

describe('createHistoryItem', () => {
  it('sets text and image from input', () => {
    const result = createHistoryItem({ text: 'hello', image: 'base64' })
    expect(result.text).toBe('hello')
    expect(result.image).toBe('base64')
  })

  it('defaults image to null when not provided', () => {
    const result = createHistoryItem({ text: 'hello' })
    expect(result.image).toBeNull()
  })

  it('starts as unpinned', () => {
    expect(createHistoryItem({ text: 'x' }).pinned).toBe(false)
  })

  it('generates a non-empty id', () => {
    expect(createHistoryItem({ text: 'x' }).id.length).toBeGreaterThan(0)
  })

  it('generates unique ids', () => {
    const a = createHistoryItem({ text: 'x' })
    const b = createHistoryItem({ text: 'x' })
    expect(a.id).not.toBe(b.id)
  })

  it('sets copiedAt to a valid ISO date', () => {
    const result = createHistoryItem({ text: 'x' })
    expect(() => new Date(result.copiedAt)).not.toThrow()
    expect(isNaN(new Date(result.copiedAt).getTime())).toBe(false)
  })
})
