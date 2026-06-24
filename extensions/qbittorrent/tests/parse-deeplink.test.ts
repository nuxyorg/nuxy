import { describe, it, expect } from 'vitest'
import { parseAddDeeplink } from '../utils/parse-deeplink.ts'

describe('parseAddDeeplink', () => {
  it('parses a url query param from the "add" path', () => {
    const result = parseAddDeeplink('add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Aabc123')
    expect(result).toEqual({ url: 'magnet:?xt=urn:btih:abc123' })
  })

  it('returns null for a path that is not "add"', () => {
    expect(parseAddDeeplink('remove?hash=abc')).toBeNull()
  })

  it('returns null when "add" has no url param', () => {
    expect(parseAddDeeplink('add')).toBeNull()
  })

  it('returns null for an empty path', () => {
    expect(parseAddDeeplink('')).toBeNull()
  })
})
