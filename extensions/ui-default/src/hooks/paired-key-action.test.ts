import { describe, it, expect, vi } from 'vitest'
import { pairedKeyAction } from './paired-key-action.ts'

describe('pairedKeyAction', () => {
  it('creates a non-clickable display group with vertical arrow hint by default', () => {
    const group = pairedKeyAction({
      label: 'Navigate',
      negative: vi.fn(),
      positive: vi.fn(),
    })
    expect(group.hint).toBe('↑↓')
    expect(group.handler).toBeUndefined()
    expect(group.children).toHaveLength(2)
    expect(group.children![0]?.key).toBe('ArrowUp')
    expect(group.children![1]?.key).toBe('ArrowDown')
  })

  it('creates a horizontal pair with modifier hint chips', () => {
    const group = pairedKeyAction({
      label: 'Move',
      axis: 'horizontal',
      modifiers: ['shift'],
      negative: vi.fn(),
      positive: vi.fn(),
    })
    expect(group.hint).toEqual(['⇧', '←→'])
    expect(group.children![0]?.modifiers).toEqual(['shift'])
    expect(group.children![0]?.key).toBe('ArrowLeft')
    expect(group.children![1]?.key).toBe('ArrowRight')
  })

  it('passes through custom hint and activeOn', () => {
    const activeOn = () => true
    const group = pairedKeyAction({
      label: 'Reorder',
      hint: ['⇧', '↑↓'],
      activeOn,
      allowRepeat: true,
      id: 'reorder',
      negative: vi.fn(),
      positive: vi.fn(),
    })
    expect(group.hint).toEqual(['⇧', '↑↓'])
    expect(group.activeOn).toBe(activeOn)
    expect(group.children![0]?.allowRepeat).toBe(true)
    expect(group.children![0]?.id).toBe('reorder-neg')
  })
})
