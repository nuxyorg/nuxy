const React = window.React

import type { AngrysearchItem } from '../types.ts'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

interface Params {
  items: AngrysearchItem[]
  handleOpen: (item: AngrysearchItem) => void
  handleOpenLocation: (item: AngrysearchItem) => void
  triggerUpdate: () => void
  setRegexMode: React.Dispatch<React.SetStateAction<boolean>>
}

interface KeyboardResult {
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}

export function useAngrysearchKeyboard({
  items,
  handleOpen,
  handleOpenLocation,
  triggerUpdate,
  setRegexMode,
}: Params): KeyboardResult {
  const selectedIndexRef = React.useRef<number>(-1)

  const { selectedIndex, setSelectedIndex } = _useListNavigation(items, {
    onEnter: (item: AngrysearchItem) => handleOpen(item),
    enterLabel: 'Open file',
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: 'Open folder',
        hint: ['⇧', 'Enter'],
        handler: () => {
          const item = items[selectedIndexRef.current]
          if (item) handleOpenLocation(item)
        },
      },
    ],
  })

  React.useLayoutEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  React.useEffect(() => {
    setSelectedIndex(items.length > 0 ? 0 : -1)
  }, [items])

  React.useEffect(() => {
    const actions = [
      { id: 'update-db', label: 'Update Database', onExecute: triggerUpdate },
      {
        id: 'toggle-regex',
        label: 'Toggle Regex Mode',
        onExecute: () => setRegexMode((m: boolean) => !m),
      },
    ]
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [triggerUpdate])

  return { selectedIndex, setSelectedIndex }
}
