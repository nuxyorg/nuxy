import { describe, it, expect } from 'vitest'
import { parseDeeplinkUrl } from './parse.js'

describe('parseDeeplinkUrl', () => {
  it('parses a simple scheme + extension id with no path or query', () => {
    const result = parseDeeplinkUrl('nuxy://settings')
    expect(result).toEqual({ extensionId: 'settings', path: '', query: {} })
  })

  it('parses extension id with a path', () => {
    const result = parseDeeplinkUrl('nuxy://settings/extension/nyaa')
    expect(result).toEqual({
      extensionId: 'settings',
      path: 'extension/nyaa',
      query: {},
    })
  })

  it('parses extension id, path, and query string', () => {
    const result = parseDeeplinkUrl('nuxy://download-manager/add?url=https://example.com/file.iso')
    expect(result).toEqual({
      extensionId: 'download-manager',
      path: 'add',
      query: { url: 'https://example.com/file.iso' },
    })
  })

  it('parses multiple query parameters', () => {
    const result = parseDeeplinkUrl('nuxy://foo/bar?a=1&b=2')
    expect(result).toEqual({
      extensionId: 'foo',
      path: 'bar',
      query: { a: '1', b: '2' },
    })
  })

  it('strips a leading slash from the path but keeps internal slashes', () => {
    const result = parseDeeplinkUrl('nuxy://settings/extension/nyaa/panel')
    expect(result?.path).toBe('extension/nyaa/panel')
  })

  it('trims trailing slash on bare extension id with trailing slash', () => {
    const result = parseDeeplinkUrl('nuxy://settings/')
    expect(result).toEqual({ extensionId: 'settings', path: '', query: {} })
  })

  it('returns null for a non-nuxy scheme', () => {
    expect(parseDeeplinkUrl('https://example.com/foo')).toBeNull()
  })

  it('returns null for a malformed URL', () => {
    expect(parseDeeplinkUrl('not a url')).toBeNull()
  })

  it('returns null when there is no extension id (empty host)', () => {
    expect(parseDeeplinkUrl('nuxy:///foo')).toBeNull()
  })

  it('decodes percent-encoded query values', () => {
    const result = parseDeeplinkUrl('nuxy://download-manager/add?url=https%3A%2F%2Fexample.com')
    expect(result).toEqual({
      extensionId: 'download-manager',
      path: 'add',
      query: { url: 'https://example.com' },
    })
  })

  it('lowercases the extension id host segment', () => {
    const result = parseDeeplinkUrl('nuxy://Settings/Extension/Nyaa')
    expect(result?.extensionId).toBe('settings')
    // path casing is preserved — extension ids are case-insensitive, paths are not
    expect(result?.path).toBe('Extension/Nyaa')
  })
})
