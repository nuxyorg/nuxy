import { describe, it, expect, vi } from 'vitest'
import { resolveOmniBarPlaceholder } from '../utils/omniBarPlaceholder.ts'

const emptyBridge = {
  toolActions: [],
  keyActionHints: [],
  omniBarPortal: null,
  footerPortal: null,
  searchPlaceholder: null,
}

describe('resolveOmniBarPlaceholder', () => {
  const t = vi.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'omniBar.placeholder') return 'What do you have in mind?'
    if (key === 'omniBar.searchTool') return `Search ${vars?.toolName ?? ''}`
    return key
  })

  it('uses the home placeholder when no tool is active', () => {
    expect(resolveOmniBarPlaceholder(emptyBridge, null, null, t)).toBe('What do you have in mind?')
  })

  it('uses the tool-specific bridge placeholder when provided', () => {
    expect(
      resolveOmniBarPlaceholder(
        { ...emptyBridge, searchPlaceholder: 'Search in notes' },
        'Notes',
        null,
        t
      )
    ).toBe('Search in notes')
  })

  it('falls back to searchTool when a tool is active without a custom placeholder', () => {
    expect(resolveOmniBarPlaceholder(emptyBridge, 'Notes', null, t)).toBe('Search Notes')
  })

  it('prefers manifest placeholder over searchTool template', () => {
    expect(resolveOmniBarPlaceholder(emptyBridge, 'Calculator', 'Type an expression…', t)).toBe(
      'Type an expression…'
    )
  })
})
