import { describe, it, expect, vi } from 'vitest'
import { flattenShellActions } from '@nuxyorg/core'
import { createGridKeyActions } from './grid-navigation.ts'
import type { KeyAction } from './useToolKeyActions.ts'

function setupDomGlobals() {
  ;(globalThis as { window?: Window }).window = {
    core: {
      shell: {
        controlOmniBar: vi.fn(),
        refreshKeyHints: vi.fn(),
      },
    },
  } as unknown as Window
}

function fire(actions: KeyAction[], key: string): void {
  flattenShellActions(actions)
    .find((a) => a.key === key)
    ?.handler?.()
}

describe('createGridKeyActions', () => {
  it('moves right and left within a row', () => {
    setupDomGlobals()
    let activeIndex = 0
    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 3,
      getCols: () => 3,
    })

    fire(actions, 'ArrowRight')
    expect(activeIndex).toBe(1)

    fire(actions, 'ArrowRight')
    expect(activeIndex).toBe(2)

    fire(actions, 'ArrowRight')
    expect(activeIndex).toBe(2)

    fire(actions, 'ArrowLeft')
    expect(activeIndex).toBe(1)
  })

  it('moves down and up by a full row using the column count', () => {
    setupDomGlobals()
    let activeIndex = 0
    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 6,
      getCols: () => 3,
    })

    fire(actions, 'ArrowDown')
    expect(activeIndex).toBe(3)

    fire(actions, 'ArrowUp')
    expect(activeIndex).toBe(0)
  })

  it('selects the first cell on the first ArrowDown and hides the omnibar', () => {
    setupDomGlobals()
    let activeIndex = -1
    const controlOmniBar = vi.fn()
    ;(window as unknown as { core: { shell: { controlOmniBar: typeof controlOmniBar } } }).core = {
      shell: { controlOmniBar },
    }

    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 3,
      getCols: () => 3,
      omnibarHandoff: true,
    })

    fire(actions, 'ArrowDown')

    expect(activeIndex).toBe(0)
    expect(controlOmniBar).toHaveBeenCalledWith('hide')
  })

  it('returns focus to the omnibar when arrowing up past the first row', () => {
    setupDomGlobals()
    let activeIndex = 0
    const controlOmniBar = vi.fn()
    ;(window as unknown as { core: { shell: { controlOmniBar: typeof controlOmniBar } } }).core = {
      shell: { controlOmniBar },
    }

    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 3,
      getCols: () => 3,
      omnibarHandoff: true,
    })

    fire(actions, 'ArrowUp')

    expect(activeIndex).toBe(-1)
    expect(controlOmniBar).toHaveBeenCalledWith('show')
  })

  it('does not move left/right when nothing is selected', () => {
    setupDomGlobals()
    let activeIndex = -1
    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 3,
      getCols: () => 3,
    })

    fire(actions, 'ArrowRight')
    expect(activeIndex).toBe(-1)

    fire(actions, 'ArrowLeft')
    expect(activeIndex).toBe(-1)
  })

  it('exposes 2D navigation as a single footer entry with all four arrows', () => {
    setupDomGlobals()
    const actions = createGridKeyActions({
      getActiveIndex: () => 0,
      setActiveIndex: () => {},
      getItemCount: () => 3,
      getCols: () => 3,
    })

    expect(actions).toHaveLength(1)
    expect(actions[0].hint).toBe('↑↓←→')
    expect(actions[0].children?.map((c) => c.key)).toEqual([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ])
  })

  it('enters the first filtered cell on ArrowDown while omnibar still owns focus', () => {
    setupDomGlobals()
    let activeIndex = -1
    const controlOmniBar = vi.fn()
    ;(window as unknown as { core: { shell: { controlOmniBar: typeof controlOmniBar } } }).core = {
      shell: { controlOmniBar },
    }

    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 2,
      getCols: () => 3,
      omnibarHandoff: true,
    })

    fire(actions, 'ArrowDown')

    expect(activeIndex).toBe(0)
    expect(controlOmniBar).toHaveBeenCalledWith('hide')
  })

  it('does not move down past the last row when the grid is not fully filled', () => {
    setupDomGlobals()
    let activeIndex = 1
    const actions = createGridKeyActions({
      getActiveIndex: () => activeIndex,
      setActiveIndex: (v) => {
        activeIndex = typeof v === 'function' ? v(activeIndex) : v
      },
      getItemCount: () => 4,
      getCols: () => 3,
    })

    fire(actions, 'ArrowDown')
    expect(activeIndex).toBe(1)
  })
})
