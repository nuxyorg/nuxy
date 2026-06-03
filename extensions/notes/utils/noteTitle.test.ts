import { describe, it, expect } from 'vitest'
import { deriveTitle } from './noteTitle.ts'

describe('deriveTitle', () => {
  it('returns "New Note" for empty string', () => {
    expect(deriveTitle('')).toBe('New Note')
  })

  it('returns "New Note" for whitespace-only string', () => {
    expect(deriveTitle('   \n  \n  ')).toBe('New Note')
  })

  it('returns the first non-empty line when it is short enough', () => {
    expect(deriveTitle('Hello world\nSecond line')).toBe('Hello world')
  })

  it('truncates the first line at 40 characters and appends ellipsis', () => {
    const longLine = 'A'.repeat(41)
    expect(deriveTitle(longLine)).toBe('A'.repeat(40) + '...')
  })

  it('returns first line exactly when it is 40 characters', () => {
    const line = 'B'.repeat(40)
    expect(deriveTitle(line)).toBe(line)
  })

  it('skips blank lines before the first content line', () => {
    expect(deriveTitle('\n\n  \nActual title\nrest')).toBe('Actual title')
  })

  it('trims leading/trailing whitespace from each line', () => {
    expect(deriveTitle('  Trimmed  \nother')).toBe('Trimmed')
  })
})
