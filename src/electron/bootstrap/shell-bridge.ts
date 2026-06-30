import type {
  CoreShell,
  OmniBarControlAction,
  ResetToolStateOptions,
  ShellAction,
  ShellBridgeSnapshot,
} from '@nuxyorg/core'
import { computeKeyHints } from '@nuxyorg/core'

function computeToolActions(actions: ShellAction[]): ShellAction[] {
  return actions.filter((a) => a.showInMenu && (typeof a.activeOn !== 'function' || a.activeOn()))
}

export function createShellBridge(): CoreShell {
  let actionsGetter: (() => ShellAction[]) | null = null
  let actionsGeneration = 0
  let omniBarPortal: HTMLElement | null = null
  let footerPortal: HTMLElement | null = null
  let searchPlaceholder: string | null = null
  let returnToShellHandler: (() => void) | null = null
  let shellResetPaused = false
  const listeners = new Set<() => void>()
  const omniBarControlListeners = new Set<(action: OmniBarControlAction) => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const bridge: CoreShell = {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSnapshot(): ShellBridgeSnapshot {
      const actions = actionsGetter ? actionsGetter() : []
      return {
        toolActions: computeToolActions(actions),
        keyActionHints: computeKeyHints(actions),
        omniBarPortal,
        footerPortal,
        searchPlaceholder,
      }
    },

    registerShellActions(getter) {
      if (getter) {
        actionsGeneration += 1
        actionsGetter = getter
        notify()
        return
      }

      // Defer clearing so a newly mounted tool can register in the same turn.
      const generation = actionsGeneration
      queueMicrotask(() => {
        if (generation !== actionsGeneration) return
        actionsGetter = null
        notify()
      })
    },

    refreshShellActions() {
      notify()
    },

    setOmniBarPortal(element) {
      omniBarPortal = element
      notify()
    },

    setFooterPortal(element) {
      footerPortal = element
      notify()
    },

    setSearchPlaceholder(placeholder) {
      searchPlaceholder = placeholder
      notify()
    },

    getShellActionsGetter() {
      return actionsGetter
    },

    controlOmniBar(action) {
      for (const handler of omniBarControlListeners) handler(action)
    },

    subscribeOmniBarControl(handler) {
      omniBarControlListeners.add(handler)
      return () => omniBarControlListeners.delete(handler)
    },

    resetToolState(options?: ResetToolStateOptions) {
      actionsGeneration += 1
      actionsGetter = null
      omniBarPortal = null
      footerPortal = null
      if (options?.clearSearchPlaceholder !== false) {
        searchPlaceholder = null
      }
      notify()
    },

    returnToShell() {
      returnToShellHandler?.()
    },

    bindReturnToShell(handler) {
      returnToShellHandler = handler
      return () => {
        if (returnToShellHandler === handler) returnToShellHandler = null
      }
    },

    setShellResetPaused(paused) {
      shellResetPaused = paused
    },

    isShellResetPaused() {
      return shellResetPaused
    },
  }

  return bridge
}
