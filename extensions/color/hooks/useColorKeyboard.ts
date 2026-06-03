const React = window.React

import type { SavedColor } from '../types.ts'

interface Handlers {
  handleSave: (color: SavedColor) => void
  handleDelete: (id: string) => void
  handleCopy: (text: string) => void
}

interface Params {
  items: SavedColor[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  currentColor: SavedColor | null
  handlers: Handlers
  getFormatted: (color: SavedColor) => string
}

export function useColorKeyboard({
  items,
  selectedIndex,
  setSelectedIndex,
  currentColor,
  handlers,
  getFormatted,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  const ref = React.useRef({ items, selectedIndex, currentColor, handlers, getFormatted })
  React.useEffect(() => {
    ref.current = { items, selectedIndex, currentColor, handlers, getFormatted }
  })

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      handler: () => {
        setSelectedIndex((i) => Math.max(-1, i - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: '',
      handler: () => {
        setSelectedIndex((i) => Math.min(i + 1, ref.current.items.length - 1))
      },
    },
    {
      key: 'Enter',
      label: 'Copy',
      hint: '↵',
      activeOn: () => ref.current.selectedIndex >= 0 || ref.current.currentColor !== null,
      handler: () => {
        const { selectedIndex: si, items: its, currentColor: cc, handlers: h, getFormatted: gf } =
          ref.current
        const active = si >= 0 ? its[si] : cc
        if (active) h.handleCopy(gf(active))
      },
    },
    {
      key: 's',
      label: 'Save',
      hint: 'S',
      activeOn: () => ref.current.currentColor !== null && ref.current.selectedIndex < 0,
      handler: () => {
        const { currentColor: cc, handlers: h } = ref.current
        if (cc) h.handleSave(cc)
      },
    },
    {
      key: 'd',
      label: 'Delete',
      hint: 'D',
      activeOn: () => ref.current.selectedIndex >= 0,
      handler: () => {
        const { selectedIndex: si, items: its, handlers: h } = ref.current
        const item = its[si]
        if (item) {
          h.handleDelete(item.id)
          setSelectedIndex(-1)
        }
      },
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, currentColor])
}
