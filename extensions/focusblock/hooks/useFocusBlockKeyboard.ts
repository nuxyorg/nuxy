const React = window.React

import type { Session } from '../types.ts'

interface Params {
  active: boolean
  sessions: Session[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  handleStart: () => void
  handleStop: () => void
  t: (key: string, vars?: Record<string, string>) => string
}

export function useFocusBlockKeyboard({
  active,
  sessions,
  selectedIndex,
  setSelectedIndex,
  handleStart,
  handleStop,
  t,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'Enter',
      label: active ? t('actions.stop') : t('actions.start'),
      hint: '↵',
      handler: () => {
        if (active) handleStop()
        else handleStart()
      },
    },
    {
      key: 's',
      label: t('actions.stop'),
      hint: 'S',
      activeOn: () => active,
      handler: handleStop,
    },
    {
      key: 'ArrowUp',
      label: t('actions.prev'),
      activeOn: () => !active && sessions.length > 0,
      handler: () => setSelectedIndex((i) => Math.max(-1, i - 1)),
    },
    {
      key: 'ArrowDown',
      label: t('actions.next'),
      hint: '↑↓',
      activeOn: () => !active && sessions.length > 0,
      handler: () => setSelectedIndex((i) => Math.min(sessions.length - 1, i + 1)),
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [])
}
