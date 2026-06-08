import type {
  CoreShell,
  OmniBarControlAction,
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
  let toolActions: ShellCommandAction[] = []
  let omniBarPortal: HTMLElement | null = null
  let footerPortal: HTMLElement | null = null
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
      }
    },

    registerKeyActions(getter) {
      keyActionsGetter = getter
      notify()
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

    resetToolState() {
      keyActionsGetter = null
      toolActions = []
      omniBarPortal = null
      footerPortal = null
      notify()
    },
  }

  return bridge
}
