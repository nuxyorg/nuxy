import type { ShellAction } from './shell.js'

/** Expand grouped display actions into keyboard-routable bindings. */
export function flattenShellActions(actions: ShellAction[]): ShellAction[] {
  const flat: ShellAction[] = []
  for (const action of actions) {
    if (action.children?.length) {
      for (const child of action.children) {
        flat.push({
          ...child,
          activeOn: child.activeOn ?? action.activeOn,
        })
      }
      continue
    }
    flat.push(action)
  }
  return flat
}

/** Footer chip actions: top-level hints, filtered by `activeOn`. */
export function computeKeyHints(actions: ShellAction[]): ShellAction[] {
  return actions.filter(
    (action) => action.hint && (typeof action.activeOn !== 'function' || action.activeOn())
  )
}

/** Whether a footer hint chip should invoke `handler` on click. */
export function isShellActionClickable(action: ShellAction): boolean {
  if (action.clickable === false) return false
  if (action.children?.length && typeof action.handler !== 'function') return false
  return typeof action.handler === 'function'
}
