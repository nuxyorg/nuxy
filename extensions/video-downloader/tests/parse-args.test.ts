import { describe, it, expect } from 'vitest'
import { parseExtraArgs } from '../utils/parse-args.ts'

describe('parseExtraArgs', () => {
  it('returns an empty array for empty, null, or whitespace-only input', () => {
    expect(parseExtraArgs('')).toEqual([])
    expect(parseExtraArgs(null)).toEqual([])
    expect(parseExtraArgs(undefined)).toEqual([])
    expect(parseExtraArgs('   ')).toEqual([])
  })

  it('splits a simple flag like "-4" into a single token', () => {
    expect(parseExtraArgs('-4')).toEqual(['-4'])
  })

  it('splits multiple flags on whitespace', () => {
    expect(parseExtraArgs('-4 --no-playlist')).toEqual(['-4', '--no-playlist'])
  })

  it('collapses runs of whitespace between tokens', () => {
    expect(parseExtraArgs('  --rate-limit   1M  ')).toEqual(['--rate-limit', '1M'])
  })

  it('keeps a double-quoted value with spaces as one token', () => {
    expect(parseExtraArgs('--add-header "User-Agent: My App"')).toEqual([
      '--add-header',
      'User-Agent: My App',
    ])
  })

  it('keeps a single-quoted value with spaces as one token', () => {
    expect(parseExtraArgs("--output 'My Folder/%(title)s.%(ext)s'")).toEqual([
      '--output',
      'My Folder/%(title)s.%(ext)s',
    ])
  })

  it('treats backslash inside single quotes literally', () => {
    expect(parseExtraArgs("'a\\b'")).toEqual(['a\\b'])
  })

  it('honours backslash escapes outside quotes', () => {
    expect(parseExtraArgs('a\\ b')).toEqual(['a b'])
  })

  it('does not interpret shell metacharacters specially', () => {
    expect(parseExtraArgs('--exec rm -rf /; echo pwned')).toEqual([
      '--exec',
      'rm',
      '-rf',
      '/;',
      'echo',
      'pwned',
    ])
  })
})
