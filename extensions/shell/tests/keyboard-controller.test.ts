// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KeyboardController } from '../controllers/keyboard-controller.ts'
import type { KeyAction } from '../types.ts'

describe('KeyboardController', () => {
  const returnToShell = vi.fn()
  const setHoldProgress = vi.fn()
  const getHoldMs = vi.fn(() => 800)
  let keyActions: KeyAction[] = []
  let controller: KeyboardController

  beforeEach(() => {
    vi.useFakeTimers()
    returnToShell.mockClear()
    setHoldProgress.mockClear()
    getHoldMs.mockClear()
    keyActions = []

    window.core = {
      shell: {
        getKeyActionsGetter: () => () => keyActions,
        getToolActions: () => [],
      },
      window: { quit: vi.fn() },
    } as never

    controller = new KeyboardController({
      isCommandPaletteOpen: () => false,
      isToolActive: () => true,
      toggleCommandPalette: vi.fn(),
      closeCommandPalette: vi.fn(),
      returnToShell,
      clearQueryAndEsc: vi.fn(),
      setHoldProgress,
      getHoldMs,
    })
    controller.bind()
  })

  afterEach(() => {
    controller.destroy()
    vi.useRealTimers()
  })

  it('does not return to shell on repeated Escape after hold completes', () => {
    let editMode = true
    keyActions = [
      {
        key: 'Escape',
        label: 'Hold Esc to exit',
        hint: 'hold Esc',
        trigger: 'hold',
        holdMs: 800,
        activeOn: () => editMode,
        handler: () => {
          editMode = false
        },
      },
    ]

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(setHoldProgress).toHaveBeenCalledWith({ ms: 800, hint: 'hold Esc' })

    vi.advanceTimersByTime(800)
    expect(editMode).toBe(false)
    expect(returnToShell).not.toHaveBeenCalled()

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', repeat: true, bubbles: true })
    )
    expect(returnToShell).not.toHaveBeenCalled()
  })

  it('returns to shell on a single Escape when no action matches', () => {
    keyActions = []

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(returnToShell).toHaveBeenCalledTimes(1)
  })

  it('clears hold progress when the held key is released early', () => {
    keyActions = [
      {
        key: 'Escape',
        label: 'Hold Esc to exit',
        hint: 'hold Esc',
        trigger: 'hold',
        holdMs: 800,
        handler: vi.fn(),
      },
    ]

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(setHoldProgress).toHaveBeenCalledWith({ ms: 800, hint: 'hold Esc' })

    setHoldProgress.mockClear()
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    expect(setHoldProgress).toHaveBeenCalledWith(null)
  })

  it('uses configured hold duration when an action omits holdMs', () => {
    getHoldMs.mockReturnValue(400)
    keyActions = [
      {
        key: 'Delete',
        label: 'Hold Del to delete',
        hint: 'hold Del',
        trigger: 'hold',
        handler: vi.fn(),
      },
    ]

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(getHoldMs).toHaveBeenCalled()
    expect(setHoldProgress).toHaveBeenCalledWith({ ms: 400, hint: 'hold Del' })
  })

  it('routes ArrowDown from the omnibar input to tool key actions', () => {
    const handler = vi.fn()
    keyActions = [{ key: 'ArrowDown', label: '', handler, allowRepeat: true }]

    const omniInput = document.createElement('input')
    omniInput.className = 'nuxy-shell-omni-bar__input'
    document.body.appendChild(omniInput)
    omniInput.focus()

    omniInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    )

    expect(handler).toHaveBeenCalledTimes(1)
    omniInput.remove()
  })

  it('shows holdCancelToast only when a hold is released before completion', () => {
    const toast = vi.fn()
    window.UI = { toast } as never

    keyActions = [
      {
        key: 'Delete',
        label: 'Hold Del to delete',
        hint: 'hold Del',
        trigger: 'hold',
        holdMs: 800,
        holdCancelToast: 'Hold Del to delete',
        handler: vi.fn(),
      },
    ]

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(toast).not.toHaveBeenCalled()

    document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Delete', bubbles: true }))
    expect(toast).toHaveBeenCalledWith('Hold Del to delete', { type: 'warning' })

    toast.mockClear()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    vi.advanceTimersByTime(800)
    expect(keyActions[0].handler).toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })
})
