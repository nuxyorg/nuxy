// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KeyboardController } from '../controllers/keyboard-controller.ts'
import type { ShellAction } from '@nuxyorg/core'

describe('KeyboardController', () => {
  const returnToShell = vi.fn()
  const setHoldProgress = vi.fn()
  const getHoldMs = vi.fn(() => 800)
  let keyActions: ShellAction[] = []
  let controller: KeyboardController

  beforeEach(() => {
    vi.useFakeTimers()
    returnToShell.mockClear()
    setHoldProgress.mockClear()
    getHoldMs.mockClear()
    keyActions = []

    window.core = {
      shell: {
        getShellActionsGetter: () => () => keyActions,
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
      hasCommandPaletteActions: vi.fn(() => false),
      hasActiveToolSettings: vi.fn(() => false),
      openActiveToolSettings: vi.fn(),
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
        handler: vi.fn(),
      },
    ]

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(setHoldProgress).toHaveBeenCalledWith({ ms: 800, hint: 'hold Esc' })

    setHoldProgress.mockClear()
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    expect(setHoldProgress).toHaveBeenCalledWith(null)
  })

  it('uses the configured hold duration from settings', () => {
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

  it('opens active tool settings on Ctrl+. when the active tool has settings', () => {
    const openActiveToolSettings = vi.fn()
    controller.destroy()
    controller = new KeyboardController({
      isCommandPaletteOpen: () => false,
      isToolActive: () => true,
      toggleCommandPalette: vi.fn(),
      closeCommandPalette: vi.fn(),
      returnToShell,
      clearQueryAndEsc: vi.fn(),
      setHoldProgress,
      getHoldMs,
      hasCommandPaletteActions: vi.fn(() => false),
      hasActiveToolSettings: vi.fn(() => true),
      openActiveToolSettings,
    })
    controller.bind()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, bubbles: true }))
    expect(openActiveToolSettings).toHaveBeenCalledTimes(1)
  })

  it('does not open settings on Ctrl+. when the active tool has none', () => {
    const openActiveToolSettings = vi.fn()
    controller.destroy()
    controller = new KeyboardController({
      isCommandPaletteOpen: () => false,
      isToolActive: () => true,
      toggleCommandPalette: vi.fn(),
      closeCommandPalette: vi.fn(),
      returnToShell,
      clearQueryAndEsc: vi.fn(),
      setHoldProgress,
      getHoldMs,
      hasCommandPaletteActions: vi.fn(() => false),
      hasActiveToolSettings: vi.fn(() => false),
      openActiveToolSettings,
    })
    controller.bind()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, bubbles: true }))
    expect(openActiveToolSettings).not.toHaveBeenCalled()
  })

  it('routes Space tool actions even when the omnibar input is focused', () => {
    const handler = vi.fn()
    keyActions = [{ key: ' ', label: 'Select', handler }]

    const input = document.createElement('input')
    input.className = 'nuxy-shell-omni-bar__input'
    document.body.appendChild(input)
    input.focus()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)

    input.remove()
  })

  it('routes keyboard events to flattened display-group children', () => {
    const up = vi.fn()
    const down = vi.fn()
    keyActions = [
      {
        label: 'Navigate',
        hint: '↑↓',
        children: [
          { key: 'ArrowUp', label: '', handler: up },
          { key: 'ArrowDown', label: '', handler: down },
        ],
      },
    ]

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(up).toHaveBeenCalledTimes(1)
    expect(down).toHaveBeenCalledTimes(1)
  })
})
