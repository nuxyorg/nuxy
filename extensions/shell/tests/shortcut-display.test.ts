import { describe, it, expect } from 'vitest'
import { formatShortcut } from '../utils/shortcut-display.ts'
import type { ShellAction } from '@nuxyorg/core'

function action(overrides: Partial<ShellAction> = {}): ShellAction {
  return { id: 'a', label: 'Action', handler: () => {}, ...overrides }
}

describe('formatShortcut', () => {
  it('returns the explicit hint when set, regardless of key/modifiers', () => {
    expect(formatShortcut(action({ hint: '⌃N', key: 'n', modifiers: ['ctrl'] }))).toEqual(['⌃N'])
  })

  it('wraps a single-string hint in an array', () => {
    expect(formatShortcut(action({ hint: 'Esc' }))).toEqual(['Esc'])
  })

  it('passes through an array hint unchanged', () => {
    expect(formatShortcut(action({ hint: ['⇧', '↵'] }))).toEqual(['⇧', '↵'])
  })

  it('derives a chip set from key + modifiers when there is no hint (menu-only actions)', () => {
    expect(formatShortcut(action({ key: 'a', modifiers: ['ctrl'] }))).toEqual(['⌃', 'A'])
  })

  it('derives multiple modifier symbols in order', () => {
    expect(formatShortcut(action({ key: 'Delete', modifiers: ['shift'] }))).toEqual(['⇧', 'Del'])
  })

  it('maps well-known keys to their symbol', () => {
    expect(formatShortcut(action({ key: 'Escape' }))).toEqual(['Esc'])
    expect(formatShortcut(action({ key: 'Enter' }))).toEqual(['↵'])
    expect(formatShortcut(action({ key: 'ArrowUp' }))).toEqual(['↑'])
  })

  it('uppercases a single-letter key with no special mapping', () => {
    expect(formatShortcut(action({ key: 'r', modifiers: ['ctrl'] }))).toEqual(['⌃', 'R'])
  })

  it('returns null when the action has neither a hint nor a key (e.g. submenu parents)', () => {
    expect(formatShortcut(action())).toBeNull()
  })
})
