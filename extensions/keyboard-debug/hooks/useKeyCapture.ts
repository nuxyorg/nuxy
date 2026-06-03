const React = window.React
const { useState, useEffect, useCallback } = React

import type { KeyEvent } from '../types.ts'

const MAX_HISTORY = 30

export function useKeyCapture() {
  const [history, setHistory] = useState<KeyEvent[]>([])
  const [lastKey, setLastKey] = useState<KeyEvent | null>(null)

  const clearHistory = useCallback(() => {
    setHistory([])
    setLastKey(null)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const modifiers: string[] = []
      if (e.ctrlKey) modifiers.push('Ctrl')
      if (e.altKey) modifiers.push('Alt')
      if (e.shiftKey) modifiers.push('Shift')
      if (e.metaKey) modifiers.push('Meta')

      const event: KeyEvent = {
        id: crypto.randomUUID(),
        key: e.key,
        code: e.code,
        modifiers,
        timestamp: Date.now(),
      }

      setLastKey(event)
      setHistory((prev) => [event, ...prev].slice(0, MAX_HISTORY))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { history, lastKey, clearHistory }
}
