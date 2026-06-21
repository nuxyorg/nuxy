import { describe, it, expect } from 'vitest'
import { parseAddDeeplink } from '../utils/parse-deeplink.ts'

describe('parseAddDeeplink', () => {
  it('parses a url query param from the "add" path', () => {
    const result = parseAddDeeplink('add?url=https%3A%2F%2Fexample.com%2Ffile.iso')
    expect(result).toEqual({ url: 'https://example.com/file.iso', fileName: undefined })
  })

  it('parses an optional fileName query param', () => {
    const result = parseAddDeeplink('add?url=https://example.com/file.iso&fileName=custom.iso')
    expect(result).toEqual({ url: 'https://example.com/file.iso', fileName: 'custom.iso' })
  })

  it('returns null for a path that is not "add"', () => {
    expect(parseAddDeeplink('remove?id=1')).toBeNull()
  })

  it('returns null when "add" has no url param', () => {
    expect(parseAddDeeplink('add')).toBeNull()
    expect(parseAddDeeplink('add?fileName=only.iso')).toBeNull()
  })

  it('returns null for an empty path', () => {
    expect(parseAddDeeplink('')).toBeNull()
  })
})
