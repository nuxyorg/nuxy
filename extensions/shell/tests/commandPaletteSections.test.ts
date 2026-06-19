import { describe, it, expect } from 'vitest'
import { groupCommandPaletteActions } from '../utils/commandPaletteSections.ts'
import type { CommandPaletteAction } from '../types.ts'

function action(id: string, label: string, section?: string): CommandPaletteAction {
  return { id, label, ...(section ? { section } : {}) }
}

describe('groupCommandPaletteActions', () => {
  it('returns a single section for actions without an explicit section', () => {
    const actions = [action('a', 'Alpha'), action('b', 'Beta')]
    expect(groupCommandPaletteActions(actions)).toEqual([
      { id: '__default__', actions: [actions[0], actions[1]] },
    ])
  })

  it('groups consecutive actions that share the same section id', () => {
    const actions = [
      action('a', 'Copy', 'actions'),
      action('b', 'Download', 'actions'),
      action('c', 'Settings', 'settings'),
    ]
    expect(groupCommandPaletteActions(actions)).toEqual([
      { id: 'actions', actions: [actions[0], actions[1]] },
      { id: 'settings', actions: [actions[2]] },
    ])
  })

  it('starts a new section when the section id changes', () => {
    const actions = [
      action('a', 'One', 'actions'),
      action('b', 'Two'),
      action('c', 'Three', 'actions'),
    ]
    expect(groupCommandPaletteActions(actions)).toEqual([
      { id: 'actions', actions: [actions[0]] },
      { id: '__default__', actions: [actions[1]] },
      { id: 'actions', actions: [actions[2]] },
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(groupCommandPaletteActions([])).toEqual([])
  })
})
