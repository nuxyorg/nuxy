import { describe, it, expect, vi, beforeEach } from 'vitest'
import { completeToolAction, getToolOnComplete, setToolSearchPlaceholder } from './tool-behavior.ts'
import type { ExtensionManifest } from '@nuxy/core'

describe('tool-behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      core: {
        shell: { returnToShell: vi.fn(), setSearchPlaceholder: vi.fn() },
        window: { hide: vi.fn() },
      },
    })
  })

  it('setToolSearchPlaceholder skips unresolved translations', () => {
    setToolSearchPlaceholder(() => '', 'search.placeholder')
    setToolSearchPlaceholder(() => 'search.placeholder', 'search.placeholder')
    expect(window.core!.shell!.setSearchPlaceholder).not.toHaveBeenCalled()
  })

  it('setToolSearchPlaceholder sets resolved translations', () => {
    setToolSearchPlaceholder(() => 'Search in notes', 'search.placeholder')
    expect(window.core!.shell!.setSearchPlaceholder).toHaveBeenCalledWith('Search in notes')
  })

  it('defaults to stay', () => {
    const manifest = { id: 'x', name: 'X', version: '1', type: 'tool' } as ExtensionManifest
    expect(getToolOnComplete(manifest)).toBe('stay')
    completeToolAction(manifest)
    expect(window.core!.shell!.returnToShell).not.toHaveBeenCalled()
    expect(window.core!.window!.hide).not.toHaveBeenCalled()
  })

  it('returnToShellAndHide returns to shell then hides', () => {
    vi.useFakeTimers()
    const manifest = {
      id: 'x',
      name: 'X',
      version: '1',
      type: 'tool',
      behavior: { onComplete: 'returnToShellAndHide' },
    } as ExtensionManifest
    completeToolAction(manifest)
    expect(window.core!.shell!.returnToShell).toHaveBeenCalledOnce()
    expect(window.core!.window!.hide).not.toHaveBeenCalled()
    vi.advanceTimersByTime(150)
    expect(window.core!.window!.hide).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
