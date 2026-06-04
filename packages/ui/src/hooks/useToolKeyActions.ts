import { useEffect, useLayoutEffect, useRef } from 'react'

export interface KeyAction {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  hint?: string | string[]
  /**
   * Optional predicate evaluated on every keydown (and on hint refresh).
   * When it returns `false`, the action is skipped silently — neither the
   * handler runs nor the hint is shown in the shortcut bar.
   * Omitting `activeOn` keeps the action always active (backward compatible).
   */
  activeOn?: () => boolean
  handler: () => void
  trigger?: 'press' | 'hold'
  holdMs?: number
}

export function useToolKeyActions(...args: any[]): any {
  return (window.UI as any)?.useToolKeyActions
    ? (window.UI as any).useToolKeyActions(...args)
    : ({} as any)
}
