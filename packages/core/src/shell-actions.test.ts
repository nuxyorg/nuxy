import { describe, it, expect, vi } from 'vitest'
import { computeKeyHints, flattenShellActions, isShellActionClickable } from './shell-actions.js'
import type { ShellAction } from './shell.js'

function action(overrides: Partial<ShellAction> = {}): ShellAction {
  return { label: 'Action', handler: () => {}, ...overrides }
}

describe('flattenShellActions', () => {
  it('returns flat actions unchanged when there are no children', () => {
    const up = action({ key: 'ArrowUp', id: 'up' })
    expect(flattenShellActions([up])).toEqual([up])
  })

  it('expands children and inherits activeOn from the parent', () => {
    const activeOn = () => true
    const upHandler = vi.fn()
    const downHandler = vi.fn()
    const flat = flattenShellActions([
      {
        label: 'Navigate',
        hint: '↑↓',
        activeOn,
        children: [
          { key: 'ArrowUp', label: '', handler: upHandler },
          { key: 'ArrowDown', label: '', handler: downHandler },
        ],
      },
    ])
    expect(flat).toHaveLength(2)
    expect(flat[0]?.key).toBe('ArrowUp')
    expect(flat[1]?.key).toBe('ArrowDown')
    expect(flat[0]?.activeOn).toBe(activeOn)
    expect(flat[0]?.handler).toBe(upHandler)
  })

  it('keeps child activeOn when explicitly set', () => {
    const childActiveOn = () => false
    const flat = flattenShellActions([
      {
        label: 'Navigate',
        hint: '↑↓',
        activeOn: () => true,
        children: [
          {
            key: 'ArrowUp',
            label: '',
            activeOn: childActiveOn,
            handler: () => {},
          },
        ],
      },
    ])
    expect(flat[0]?.activeOn).toBe(childActiveOn)
  })
})

describe('computeKeyHints', () => {
  it('includes flat actions with hints', () => {
    const hints = computeKeyHints([action({ key: 'Enter', hint: '↵' })])
    expect(hints).toHaveLength(1)
  })

  it('includes display groups with hints and no key', () => {
    const hints = computeKeyHints([
      {
        label: 'Navigate',
        hint: '↑↓',
        children: [
          { key: 'ArrowUp', label: '', handler: () => {} },
          { key: 'ArrowDown', label: '', handler: () => {} },
        ],
      },
    ])
    expect(hints).toHaveLength(1)
    expect(hints[0]?.label).toBe('Navigate')
  })

  it('filters by activeOn', () => {
    const hints = computeKeyHints([
      action({ hint: '↵', activeOn: () => false }),
      action({ hint: 'Del', activeOn: () => true }),
    ])
    expect(hints).toHaveLength(1)
    expect(hints[0]?.hint).toBe('Del')
  })
})

describe('isShellActionClickable', () => {
  it('returns true for a normal action with handler', () => {
    expect(isShellActionClickable(action({ key: 'Enter', hint: '↵' }))).toBe(true)
  })

  it('returns false when clickable is explicitly false', () => {
    expect(isShellActionClickable(action({ clickable: false, hint: '↵' }))).toBe(false)
  })

  it('returns false for display groups without a parent handler', () => {
    expect(
      isShellActionClickable({
        label: 'Navigate',
        hint: '↑↓',
        children: [{ key: 'ArrowUp', label: '', handler: () => {} }],
      })
    ).toBe(false)
  })
})
