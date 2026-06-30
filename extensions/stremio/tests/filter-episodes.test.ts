import { describe, it, expect } from 'vitest'
import { filterEpisodes } from '../utils/filter-episodes.ts'
import type { EpisodeResult } from '../types.ts'

const EP1: EpisodeResult = {
  id: 'tt1:1:1',
  season: 1,
  episode: 1,
  title: 'Winter Is Coming',
  released: '2011-04-17',
  thumbnail: '',
  overview: "Ned Stark arrives in King's Landing.",
}

const EP2: EpisodeResult = {
  id: 'tt1:1:2',
  season: 1,
  episode: 2,
  title: 'The Kingsroad',
  released: '2011-04-24',
  thumbnail: '',
  overview: 'Jon Snow leaves for the Wall.',
}

describe('filterEpisodes', () => {
  it('returns all episodes when the query is empty', () => {
    expect(filterEpisodes([EP1, EP2], '')).toEqual([EP1, EP2])
    expect(filterEpisodes([EP1, EP2], '   ')).toEqual([EP1, EP2])
  })

  it('matches episode titles case-insensitively', () => {
    expect(filterEpisodes([EP1, EP2], 'winter')).toEqual([EP1])
    expect(filterEpisodes([EP1, EP2], 'KINGSROAD')).toEqual([EP2])
  })

  it('matches SxxExx and season/episode numbers', () => {
    expect(filterEpisodes([EP1, EP2], 's01e02')).toEqual([EP2])
    expect(filterEpisodes([EP1, EP2], '1x01')).toEqual([EP1])
    expect(filterEpisodes([EP1, EP2], 'season 1')).toEqual([EP1, EP2])
  })

  it('matches overview text', () => {
    expect(filterEpisodes([EP1, EP2], 'wall')).toEqual([EP2])
  })
})
