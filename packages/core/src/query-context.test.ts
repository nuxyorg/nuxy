import { describe, it, expect } from 'vitest'
import { classifyQuery } from './query-context.ts'

describe('classifyQuery', () => {
  it('classifies empty input as text only', () => {
    expect(classifyQuery('')).toEqual({ raw: '', types: ['text'] })
    expect(classifyQuery('   ')).toEqual({ raw: '   ', types: ['text'] })
  })

  it('classifies a plain word as text', () => {
    const ctx = classifyQuery('hello')
    expect(ctx.types).toEqual(['text'])
  })

  it('classifies http(s) URLs', () => {
    const ctx = classifyQuery('https://example.com/path')
    expect(ctx.types).toContain('url')
    expect(ctx.url).toBeInstanceOf(URL)
    expect(ctx.url?.hostname).toBe('example.com')
  })

  it('classifies bare www. URLs by prepending https', () => {
    const ctx = classifyQuery('www.example.com')
    expect(ctx.types).toContain('url')
    expect(ctx.url?.protocol).toBe('https:')
  })

  it('falls back to text when the URL is malformed', () => {
    const ctx = classifyQuery('https://')
    expect(ctx.types).toEqual(['text'])
    expect(ctx.url).toBeUndefined()
  })

  it('detects known video hosts within a URL', () => {
    const ctx = classifyQuery('https://www.youtube.com/watch?v=abc')
    expect(ctx.types).toEqual(['url', 'video', 'text'])
  })

  it('detects a file extension at the end of a URL path', () => {
    const ctx = classifyQuery('https://example.com/image.png')
    expect(ctx.types).toContain('image')
    expect(ctx.fileExt).toBe('png')
  })

  it('classifies 3/4/6/8-digit hex colors', () => {
    expect(classifyQuery('#fff').types).toContain('color')
    expect(classifyQuery('#ff6600').color).toBe('#ff6600')
    expect(classifyQuery('#FF6600').color).toBe('#ff6600')
  })

  it('classifies functional color notation', () => {
    expect(classifyQuery('rgb(255, 0, 0)').types).toContain('color')
    expect(classifyQuery('hsla(0, 100%, 50%, 1)').types).toContain('color')
  })

  it('classifies arithmetic expressions as math', () => {
    const ctx = classifyQuery('2 + 2')
    expect(ctx.types).toContain('math')
  })

  it('does not classify a bare number as math without an operator', () => {
    const ctx = classifyQuery('42')
    expect(ctx.types).not.toContain('math')
  })

  it('does not classify a math-looking string as math when it is a URL', () => {
    const ctx = classifyQuery('https://example.com/1+1')
    expect(ctx.types).not.toContain('math')
  })

  it('classifies absolute and home-relative filesystem paths', () => {
    expect(classifyQuery('/usr/local/bin').types).toContain('path')
    expect(classifyQuery('~/Documents/file.pdf').types).toContain('path')
  })

  it('detects a file extension on a filesystem path', () => {
    const ctx = classifyQuery('/home/user/archive.zip')
    expect(ctx.types).toContain('archive')
    expect(ctx.fileExt).toBe('zip')
  })

  it('classifies email addresses', () => {
    const ctx = classifyQuery('user@example.com')
    expect(ctx.types).toContain('email')
  })

  it('does not classify an email-shaped string as email when it is a URL', () => {
    const ctx = classifyQuery('https://user@example.com')
    expect(ctx.types).not.toContain('email')
  })

  it('always ends with text as a fallback type', () => {
    expect(classifyQuery('hello').types.at(-1)).toBe('text')
    expect(classifyQuery('#fff').types.at(-1)).toBe('text')
  })
})
