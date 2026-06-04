const React = window.React
const { useEffect } = React

import type { KeyEvent } from '../types.ts'

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Params {
  history: KeyEvent[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  clearHistory: () => void
  t: (key: string) => string
}

export function useKeyDebugKeyboard({
  history,
  selectedIndex,
  setSelectedIndex,
  clearHistory,
  t,
}: Params): void {
  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: t('actions.navigate'),
      hint: '↑↓',
      handler: () => {
        if (history.length === 0) return
        setSelectedIndex((prev: number) => (prev <= 0 ? -1 : prev - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: '',
      handler: () => {
        if (history.length === 0) return
        setSelectedIndex((prev: number) => Math.min(prev + 1, history.length - 1))
      },
    },
    {
      key: 'c',
      label: t('actions.clear'),
      hint: 'C',
      activeOn: () => history.length > 0,
      handler: clearHistory,
    },
    {
      key: 'Escape',
      label: t('actions.exit'),
      hint: 'Esc',
      trigger: 'hold',
      holdMs: 600,
      handler: () => {
        window.dispatchEvent(
          new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
        )
        window.core?.window?.esc?.()
      },
    },
  ])

  useEffect(() => {
    const actions =
      history.length > 0
        ? [{ id: 'kbd-debug-clear', label: 'Clear Key History', onExecute: clearHistory }]
        : []
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [history.length])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, history.length])
}
