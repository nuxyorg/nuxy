import { describe, it, expect } from 'vitest'
import { parseFavorites, isFavorited, toggleFavorite } from '../utils/favorites.ts'
import type { MetaResult } from '../types.ts'

const A: MetaResult = { id: 'tt1', type: 'movie', name: 'A', year: '2001', poster: 'pa' }
const B: MetaResult = { id: 'tt2', type: 'series', name: 'B', year: '2002', poster: 'pb' }

describe('parseFavorites', () => {
  it('keeps well-formed entries and drops malformed ones', () => {
    const raw = [
      A,
      { id: 'tt3', name: 'C', type: 'movie' },
      { id: 'no-type', name: 'X' },
      { name: 'missing id', type: 'movie' },
      'nope',
    ]
    expect(parseFavorites(raw)).toEqual([
      A,
      { id: 'tt3', type: 'movie', name: 'C', year: '', poster: '' },
    ])
  })

  it('returns [] for non-array input', () => {
    expect(parseFavorites(null)).toEqual([])
    expect(parseFavorites({})).toEqual([])
  })
})

describe('isFavorited', () => {
  it('matches by id', () => {
    expect(isFavorited([A, B], 'tt2')).toBe(true)
    expect(isFavorited([A], 'tt2')).toBe(false)
  })
})

describe('toggleFavorite', () => {
  it('adds a title that is not yet favorited', () => {
    expect(toggleFavorite([A], B)).toEqual({ favorites: [A, B], isFavorite: true })
  })

  it('removes a title that is already favorited', () => {
    expect(toggleFavorite([A, B], A)).toEqual({ favorites: [B], isFavorite: false })
  })

  it('does not mutate the input list', () => {
    const list = [A]
    toggleFavorite(list, B)
    expect(list).toEqual([A])
  })
})
