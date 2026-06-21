import { describe, it, expect } from 'vitest'
import { selectEmptyState, parseIgnoredRoots } from '../utils.ts'
import type { DbStatus } from '../types.ts'

const t = (key: string) => key

describe('selectEmptyState', () => {
  it('returns null when there are items to show', () => {
    expect(selectEmptyState(null, 'foo', true, t)).toBeNull()
  })

  it('prioritizes the updating message over a short query', () => {
    const status: DbStatus = { isUpdating: true, lastUpdate: null, exists: false }
    expect(selectEmptyState(status, 'ab', false, t)).toEqual({ message: 'db.updating' })
  })

  it('prioritizes the updating message over no-matches', () => {
    const status: DbStatus = { isUpdating: true, lastUpdate: null, exists: true }
    expect(selectEmptyState(status, 'some query', false, t)).toEqual({ message: 'db.updating' })
  })

  it('shows db missing when the index does not exist and is not updating', () => {
    const status: DbStatus = { isUpdating: false, lastUpdate: null, exists: false }
    expect(selectEmptyState(status, 'some query', false, t)).toEqual({ message: 'db.missing' })
  })

  it('shows type-to-search hint for short queries once the db is ready', () => {
    const status: DbStatus = { isUpdating: false, lastUpdate: null, exists: true }
    expect(selectEmptyState(status, 'ab', false, t)).toEqual({
      message: 'empty.typeToSearch',
      hint: 'empty.typeHint',
    })
  })

  it('shows no-matches for a long enough query with a ready db and no results', () => {
    const status: DbStatus = { isUpdating: false, lastUpdate: null, exists: true }
    expect(selectEmptyState(status, 'no results query', false, t)).toEqual({
      message: 'empty.noMatches',
      hint: 'empty.noMatchesHint',
    })
  })

  it('falls back to type-to-search when status has not loaded yet', () => {
    expect(selectEmptyState(null, 'ab', false, t)).toEqual({
      message: 'empty.typeToSearch',
      hint: 'empty.typeHint',
    })
  })
})

describe('parseIgnoredRoots', () => {
  it('returns the array as-is when already an array of strings', () => {
    expect(parseIgnoredRoots(['/proc', '/dev'])).toEqual(['/proc', '/dev'])
  })

  it('migrates a legacy comma-separated string', () => {
    expect(parseIgnoredRoots('/proc,/dev, /sys ,')).toEqual(['/proc', '/dev', '/sys'])
  })

  it('returns an empty array for null/undefined', () => {
    expect(parseIgnoredRoots(undefined)).toEqual([])
    expect(parseIgnoredRoots(null)).toEqual([])
  })

  it('filters out non-string entries from an array value', () => {
    expect(parseIgnoredRoots(['/proc', 1, null])).toEqual(['/proc'])
  })
})
