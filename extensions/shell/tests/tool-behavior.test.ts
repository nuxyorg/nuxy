import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  completeToolAction,
  getToolOnComplete,
  setToolSearchPlaceholder,
  shouldSuppressBlurHide,
  syncBlurSuppression,
} from '@nuxyorg/extension-sdk'
import type { ExtensionManifest } from '@nuxyorg/core'

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

  it('shouldSuppressBlurHide reads manifest behavior flag', () => {
    expect(
      shouldSuppressBlurHide({
        id: 'x',
        name: 'X',
        version: '1',
        type: 'tool',
      } as ExtensionManifest)
    ).toBe(false)
    expect(
      shouldSuppressBlurHide({
        id: 'x',
        name: 'X',
        version: '1',
        type: 'tool',
        behavior: { suppressBlurHide: true },
      } as ExtensionManifest)
    ).toBe(true)
  })

  it('syncBlurSuppression toggles window API from active tool manifest', () => {
    const setBlurSuppressed = vi.fn()
    vi.stubGlobal('window', {
      core: {
        shell: { returnToShell: vi.fn(), setSearchPlaceholder: vi.fn() },
        window: { hide: vi.fn(), setBlurSuppressed },
      },
    })
    const manifest = {
      id: 'com.nuxy.file-transfer',
      name: 'File Transfer',
      version: '1',
      type: 'tool',
      behavior: { suppressBlurHide: true },
    } as ExtensionManifest

    syncBlurSuppression('com.nuxy.file-transfer', manifest)
    expect(setBlurSuppressed).toHaveBeenCalledWith(true, 'manifest')

    syncBlurSuppression(null, null)
    expect(setBlurSuppressed).toHaveBeenCalledWith(false, 'manifest')
  })

  it('syncBlurSuppression does not clear tool-layer suppression for notes', () => {
    const setBlurSuppressed = vi.fn()
    vi.stubGlobal('window', {
      core: {
        shell: { returnToShell: vi.fn(), setSearchPlaceholder: vi.fn() },
        window: { hide: vi.fn(), setBlurSuppressed },
      },
    })
    const manifest = {
      id: 'com.nuxy.notes',
      name: 'Notes',
      version: '1',
      type: 'tool',
    } as ExtensionManifest

    syncBlurSuppression('com.nuxy.notes', manifest)
    expect(setBlurSuppressed).toHaveBeenCalledWith(false, 'manifest')
  })
})
