const React = window.React

import type { NyaaResult } from '../types.ts'

interface Params {
  results: NyaaResult[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  onCopy: (id: string, magnet: string) => void
}

export function useNyaaKeyboard({ results, selectedIndex, setSelectedIndex, onCopy }: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      handler: () => {
        if (results.length === 0) return
        setSelectedIndex((prev: number) => (prev <= 0 ? -1 : prev - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: '',
      handler: () => {
        if (results.length === 0) return
        setSelectedIndex((prev: number) => Math.min(prev + 1, results.length - 1))
      },
    },
    {
      key: 'Enter',
      label: 'Copy Magnet',
      hint: '↵',
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        const item = results[selectedIndex]
        if (!item) return
        onCopy(item.id, item.magnet)
      },
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  React.useEffect(() => {
    const item = selectedIndex >= 0 ? results[selectedIndex] : null
    const actions = item
      ? [{ id: 'nyaa-copy-magnet', label: 'Copy Magnet Link', onExecute: () => onCopy(item.id, item.magnet) }]
      : []
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [selectedIndex, results])
}
