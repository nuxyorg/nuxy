import type {
  CoreShell,
  OmniBarControlAction,
  ResetToolStateOptions,
  ShellBridgeSnapshot,
  ShellCommandAction,
  ShellKeyAction,
} from '@nuxy/core'

function computeHints(getter: (() => ShellKeyAction[]) | null): ShellKeyAction[] {
  if (!getter) return []
  return getter().filter((a) => a.hint && (typeof a.activeOn !== 'function' || a.activeOn()))
}

export function createShellBridge(): CoreShell {
  let keyActionsGetter: (() => ShellKeyAction[]) | null = null
  let keyActionsGeneration = 0
  let toolActions: ShellCommandAction[] = []
  let omniBarPortal: HTMLElement | null = null
  let footerPortal: HTMLElement | null = null
  let searchPlaceholder: string | null = null
  let returnToShellHandler: (() => void) | null = null
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
      return {
        toolActions,
        keyActionHints: computeHints(keyActionsGetter),
        omniBarPortal,
        footerPortal,
        searchPlaceholder,
      }
    },

    registerKeyActions(getter) {
      if (getter) {
        keyActionsGeneration += 1
        keyActionsGetter = getter
        notify()
        return
      }

      // Defer clearing so a newly mounted tool can register in the same turn.
      const generation = keyActionsGeneration
      queueMicrotask(() => {
        if (generation !== keyActionsGeneration) return
        keyActionsGetter = null
        notify()
      })
    },

    refreshKeyHints() {
      notify()
    },

    registerActions(actions) {
      toolActions = actions
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

    getKeyActionsGetter() {
      return keyActionsGetter
    },

    getToolActions() {
      return toolActions
    },

    controlOmniBar(action) {
      for (const handler of omniBarControlListeners) handler(action)
    },

    subscribeOmniBarControl(handler) {
      omniBarControlListeners.add(handler)
      return () => omniBarControlListeners.delete(handler)
    },

    resetToolState(options?: ResetToolStateOptions) {
      keyActionsGeneration += 1
      keyActionsGetter = null
      toolActions = []
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
  }

  return bridge
}
