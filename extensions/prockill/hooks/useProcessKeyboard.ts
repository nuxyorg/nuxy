const React = window.React

import type { ProcessInfo } from '../types.ts'

interface Handlers {
  handleKill: (proc: ProcessInfo, signal: 'SIGTERM' | 'SIGKILL') => void
  loadProcesses: () => void
}

interface Labels {
  killLabel: string
  forceKillLabel: string
  refreshLabel: string
}

interface Params {
  processes: ProcessInfo[]
  handlers: Handlers
  labels: Labels
}

interface KeyboardResult {
  selectedIndex: number
  setSelectedIndex: (idx: number) => void
}

export function useProcessKeyboard({ processes, handlers, labels }: Params): KeyboardResult {
  const { handleKill, loadProcesses } = handlers
  const { killLabel, forceKillLabel, refreshLabel } = labels

  const _useListNavigation =
    (window.UI || {}).useListNavigation ||
    (() => ({ selectedIndex: -1, setSelectedIndex: () => {} }))

  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  // Keep a ref to processes to avoid stale closures in key handlers
  const processesRef = React.useRef<ProcessInfo[]>(processes)
  React.useEffect(() => {
    processesRef.current = processes
  }, [processes])

  const { selectedIndex, setSelectedIndex } = _useListNavigation(processes, {
    onEnter: (item: ProcessInfo) => handleKill(item, 'SIGTERM'),
    enterLabel: killLabel,
    enterHint: '↵',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: forceKillLabel,
        hint: ['⇧', '↵'],
        activeOn: () => selectedIndex >= 0,
        handler: () => {
          if (selectedIndex >= 0) handleKill(processesRef.current[selectedIndex], 'SIGKILL')
        },
      },
    ],
  })

  _useToolKeyActions([
    {
      key: 'r',
      label: refreshLabel,
      hint: 'R',
      handler: () => loadProcesses(),
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return { selectedIndex, setSelectedIndex }
}
