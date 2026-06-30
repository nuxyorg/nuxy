import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ShellAction } from '@nuxyorg/core'

export type KeyAction = ShellAction

// Registry for Lit reactive controllers
const activeControllers = new Set<KeyActionsController>()

// Registry for legacy hook-based actions
const legacyActionsList: KeyAction[][] = []

function getCombinedActions(): KeyAction[] {
  const allActions: KeyAction[] = []
  // Add legacy actions
  for (const list of legacyActionsList) {
    allActions.push(...list)
  }
  // Add controller actions
  for (const ctrl of activeControllers) {
    allActions.push(...ctrl.getActions())
  }
  return allActions
}

function hasComponentActions(): boolean {
  return legacyActionsList.length > 0 || activeControllers.size > 0
}

/** Tool-level getter registered before a KeyActionsController mounts (e.g. Enter on nuxy-grid). */
let parentActionsGetter: (() => KeyAction[]) | null = null

function mergedShellActionsGetter(): KeyAction[] {
  const parent = parentActionsGetter?.() ?? []
  return [...parent, ...getCombinedActions()]
}

let isRegistered = false

function restoreParentRegistration(): void {
  isRegistered = false
  if (parentActionsGetter) {
    window.core?.shell?.registerShellActions(parentActionsGetter)
    parentActionsGetter = null
  } else {
    window.core?.shell?.registerShellActions(null)
  }
}

function ensureShellRegistration() {
  if (!window.core?.shell?.registerShellActions) return

  if (!hasComponentActions()) {
    if (isRegistered) restoreParentRegistration()
    return
  }

  const current = window.core.shell.getShellActionsGetter?.()
  if (isRegistered && current === mergedShellActionsGetter) return

  if (current && current !== mergedShellActionsGetter) {
    parentActionsGetter = current
  }
  window.core.shell.registerShellActions(mergedShellActionsGetter)
  isRegistered = true
}

export class KeyActionsController implements ReactiveController {
  constructor(
    private host: ReactiveControllerHost,
    public getActions: () => KeyAction[]
  ) {
    this.host.addController(this)
  }

  hostConnected() {
    activeControllers.add(this)
    ensureShellRegistration()
    window.core?.shell?.refreshShellActions()
  }

  hostDisconnected() {
    activeControllers.delete(this)
    if (!hasComponentActions()) {
      restoreParentRegistration()
    } else {
      window.core?.shell?.refreshShellActions()
    }
  }
}

export function useToolKeyActions(actions: KeyAction[]): void {
  // If this list of actions is not already in legacy actions, add it
  if (!legacyActionsList.includes(actions)) {
    legacyActionsList.push(actions)
  }
  ensureShellRegistration()
  window.core?.shell?.refreshShellActions()
}

export function unregisterToolKeyActions(): void {
  legacyActionsList.length = 0
  if (!hasComponentActions()) {
    restoreParentRegistration()
  } else {
    window.core?.shell?.refreshShellActions()
  }
}

/** @internal Resets module state between unit tests. */
export function resetKeyActionsRegistrationForTest(): void {
  activeControllers.clear()
  legacyActionsList.length = 0
  parentActionsGetter = null
  isRegistered = false
}
