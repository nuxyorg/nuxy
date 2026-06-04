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
  /** When true, the handler fires on every repeated keydown while the key is held. Default: false. */
  allowRepeat?: boolean
  /**
   * 'press' (default): fires immediately on keydown.
   * 'hold': fires only after the key has been held for `holdMs` milliseconds.
   * While holding, a visual progress bar fills across the omnibar.
   */
  trigger?: 'press' | 'hold'
  /** Duration in milliseconds for hold trigger. Default: 600. */
  holdMs?: number
}

export function useToolKeyActions(actions: KeyAction[]): void {
  // actionsRef holds latest closures so shell doesn't need to re-render
  const actionsRef = useRef(actions)

  // Keep ref current every render (no deps = runs every render)
  useLayoutEffect(() => {
    actionsRef.current = actions
  })

  useEffect(() => {
    const getter = () => actionsRef.current
    window.dispatchEvent(
      new CustomEvent('nuxy-register-key-actions', {
        detail: { getActions: getter },
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-key-actions', { detail: null }))
    }
  }, []) // only on mount/unmount — handlers stay fresh via actionsRef

  // When labels change (e.g. after async translations load), notify shell to re-compute hints
  const labelsKey = actions.map((a) => a.label).join('\x00')
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [labelsKey])
}
