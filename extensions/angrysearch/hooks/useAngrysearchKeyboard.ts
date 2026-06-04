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
  t: (key: string) => string
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
  t,
}: Params): KeyboardResult {
  const selectedIndexRef = React.useRef<number>(-1)

  const { selectedIndex, setSelectedIndex } = _useListNavigation(items, {
    onEnter: (item: AngrysearchItem) => handleOpen(item),
    enterLabel: t('actions.openFile'),
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: t('actions.openFolder'),
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
      { id: 'update-db', label: t('actions.updateDatabase'), onExecute: triggerUpdate },
      {
        id: 'toggle-regex',
        label: t('actions.toggleRegex'),
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
