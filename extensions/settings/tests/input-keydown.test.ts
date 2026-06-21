import { describe, it, expect, vi } from 'vitest'
import { handleSettingsInputKeydown, handleListAddInputKeydown } from '../utils/input-keydown.ts'

describe('handleSettingsInputKeydown', () => {
  it('blurs the input on Escape and stops the event from bubbling to the shell', () => {
    const blur = vi.fn()
    const stopPropagation = vi.fn()
    handleSettingsInputKeydown({ key: 'Escape', stopPropagation }, { blur })

    expect(blur).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })

  it('blurs the input on Enter without stopping propagation', () => {
    const blur = vi.fn()
    const stopPropagation = vi.fn()
    handleSettingsInputKeydown({ key: 'Enter', stopPropagation }, { blur })

    expect(blur).toHaveBeenCalledTimes(1)
    expect(stopPropagation).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const blur = vi.fn()
    const stopPropagation = vi.fn()
    handleSettingsInputKeydown({ key: 'a', stopPropagation }, { blur })

    expect(blur).not.toHaveBeenCalled()
    expect(stopPropagation).not.toHaveBeenCalled()
  })
})

describe('handleListAddInputKeydown', () => {
  it('adds the trimmed value and clears the input on Enter', () => {
    const onAdd = vi.fn()
    const input = { value: '/proc', blur: vi.fn() }
    handleListAddInputKeydown({ key: 'Enter', stopPropagation: vi.fn() }, input, onAdd)

    expect(onAdd).toHaveBeenCalledWith('/proc')
    expect(input.value).toBe('')
    expect(input.blur).not.toHaveBeenCalled()
  })

  it('blurs and stops propagation on Escape without adding', () => {
    const onAdd = vi.fn()
    const stopPropagation = vi.fn()
    const input = { value: '/proc', blur: vi.fn() }
    handleListAddInputKeydown({ key: 'Escape', stopPropagation }, input, onAdd)

    expect(onAdd).not.toHaveBeenCalled()
    expect(stopPropagation).toHaveBeenCalledTimes(1)
    expect(input.blur).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onAdd = vi.fn()
    const input = { value: '/proc', blur: vi.fn() }
    handleListAddInputKeydown({ key: 'a', stopPropagation: vi.fn() }, input, onAdd)

    expect(onAdd).not.toHaveBeenCalled()
    expect(input.value).toBe('/proc')
  })
})
