import { describe, it, expect } from 'vitest'
import { isTorrentLink } from '../utils/torrent-link.ts'

describe('isTorrentLink', () => {
  it('returns false for empty or whitespace-only input', () => {
    expect(isTorrentLink('')).toBe(false)
    expect(isTorrentLink('   ')).toBe(false)
  })

  it('returns true for a magnet link', () => {
    expect(isTorrentLink('magnet:?xt=urn:btih:abc123&dn=Test')).toBe(true)
  })

  it('is case-insensitive for the magnet scheme', () => {
    expect(isTorrentLink('MAGNET:?xt=urn:btih:abc123')).toBe(true)
  })

  it('returns true for an http(s) URL ending in .torrent', () => {
    expect(isTorrentLink('https://example.com/file.torrent')).toBe(true)
    expect(isTorrentLink('http://example.com/file.torrent')).toBe(true)
  })

  it('returns true for a .torrent URL with a query string', () => {
    expect(isTorrentLink('https://example.com/file.torrent?token=abc')).toBe(true)
  })

  it('returns true for a .torrent URL with a hash fragment', () => {
    expect(isTorrentLink('https://example.com/file.torrent#section')).toBe(true)
  })

  it('returns false for a plain search query', () => {
    expect(isTorrentLink('ubuntu iso')).toBe(false)
  })

  it('returns false for a non-torrent URL', () => {
    expect(isTorrentLink('https://example.com/page.html')).toBe(false)
  })

  it('trims surrounding whitespace before checking', () => {
    expect(isTorrentLink('  magnet:?xt=urn:btih:abc123  ')).toBe(true)
  })
})
