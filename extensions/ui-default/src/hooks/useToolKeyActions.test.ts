// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KeyActionsController, type KeyAction } from './useToolKeyActions.ts'

describe('KeyActionsController shell registration', () => {
  let keyActionsGetter: (() => KeyAction[]) | null = null
  const registerShellActions = vi.fn((getter: (() => KeyAction[]) | null) => {
    keyActionsGetter = getter
  })

  beforeEach(() => {
    keyActionsGetter = null
    registerShellActions.mockClear()
    window.core = {
      shell: {
        registerShellActions,
        getShellActionsGetter: () => keyActionsGetter,
        refreshShellActions: vi.fn(),
      },
    } as never
  })

  afterEach(() => {
    delete (window as { core?: unknown }).core
  })

  it('re-registers key actions after resetToolState clears the getter', () => {
    const host = {
      addController: vi.fn(),
      removeController: vi.fn(),
      requestUpdate: vi.fn(),
      updateComplete: Promise.resolve(true),
    }

    const ctrl = new KeyActionsController(host, () => [
      { key: 'ArrowDown', label: '', handler: vi.fn() },
    ])
    ctrl.hostConnected()
    expect(registerShellActions).toHaveBeenCalledTimes(1)
    expect(registerShellActions.mock.calls[0]![0]!()).toHaveLength(1)

    keyActionsGetter = null
    ctrl.hostDisconnected()

    ctrl.hostConnected()
    expect(registerShellActions).toHaveBeenCalledTimes(2)
    expect(registerShellActions.mock.calls[1]![0]!()).toHaveLength(1)
  })
})
