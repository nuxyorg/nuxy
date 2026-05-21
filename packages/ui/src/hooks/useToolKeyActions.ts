import { useEffect, useLayoutEffect, useRef } from 'react'

export interface KeyAction {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  hint?: string
  handler: () => void
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
    const hints = actions.filter((a) => a.hint)
    window.dispatchEvent(
      new CustomEvent('nuxy-register-key-actions', {
        detail: { getActions: getter, hints },
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-key-actions', { detail: null }))
    }
  }, []) // only on mount/unmount — handlers stay fresh via actionsRef
}
