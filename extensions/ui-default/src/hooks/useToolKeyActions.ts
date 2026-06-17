import type { ReactiveController, ReactiveControllerHost } from 'lit'

export interface KeyAction {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  handler: () => void
  allowRepeat?: boolean
  trigger?: 'press' | 'hold'
  holdMs?: number
  holdCancelToast?: string
}

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

let isRegistered = false
function ensureShellRegistration() {
  if (isRegistered) return
  isRegistered = true
  window.core?.shell?.registerKeyActions(() => getCombinedActions())
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
    window.core?.shell?.refreshKeyHints()
  }

  hostDisconnected() {
    activeControllers.delete(this)
    window.core?.shell?.refreshKeyHints()
  }
}

export function useToolKeyActions(actions: KeyAction[]): void {
  // If this list of actions is not already in legacy actions, add it
  if (!legacyActionsList.includes(actions)) {
    legacyActionsList.push(actions)
  }
  ensureShellRegistration()
  window.core?.shell?.refreshKeyHints()
}

export function unregisterToolKeyActions(): void {
  legacyActionsList.length = 0
  window.core?.shell?.refreshKeyHints()
}
