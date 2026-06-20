import type {
  CoreEvents,
  CoreShell,
  NuxyRendererEvent,
  OmniBarControlAction,
  ResetToolStateOptions,
  ShellAction,
  ShellBridgeSnapshot,
} from '@nuxyorg/core'

function computeKeyHints(actions: ShellAction[]): ShellAction[] {
  return actions.filter((a) => a.hint && (typeof a.activeOn !== 'function' || a.activeOn()))
}

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

  return {
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
}

export function createEventsBridge(): CoreEvents {
  const listeners = new Map<NuxyRendererEvent, Set<(detail: unknown) => void>>()

  return {
    emit(type, ...args) {
      const detail = args[0]
      const set = listeners.get(type)
      if (!set) return
      for (const handler of set) handler(detail)
    },

    on(type, handler) {
      let set = listeners.get(type)
      if (!set) {
        set = new Set()
        listeners.set(type, set)
      }
      const wrapped = handler as (detail: unknown) => void
      set.add(wrapped)
      return () => {
        set!.delete(wrapped)
      }
    },
  }
}
