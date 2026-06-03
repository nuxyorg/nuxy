const React = window.React

import type { ClipboardItem } from '../types.ts'
import { getItemType } from '../utils/itemType.ts'

interface Handlers {
  handleCopy: (id: string) => void
  handleCopyFile: (id: string) => void
  handleDelete: (id: string) => void
  handlePin: (id: string) => void
  handleUnpin: (id: string) => void
}

interface Params {
  filteredItems: ClipboardItem[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  handlers: Handlers
}

export function useClipboardKeyboard({ filteredItems, selectedIndex, setSelectedIndex, handlers }: Params): void {
  const { handleCopy, handleCopyFile, handleDelete, handlePin, handleUnpin } = handlers
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      handler: () => {
        if (filteredItems.length === 0) return
        setSelectedIndex((prev: number) => (prev <= 0 ? -1 : prev - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: 'Next item',
      handler: () => {
        if (filteredItems.length === 0) return
        setSelectedIndex((prev: number) => Math.min(prev + 1, filteredItems.length - 1))
      },
    },
    {
      key: 'Enter',
      label: 'Copy',
      hint: '↵',
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        const item = filteredItems[selectedIndex]
        if (!item) return
        if (getItemType(item) === 'file') handleCopyFile(item.id)
        else handleCopy(item.id)
      },
    },
  ])

  React.useEffect(() => {
    const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    const actions = selectedItem
      ? [
          { id: 'clipboard-delete', label: 'Delete Selected Item', onExecute: () => handleDelete(selectedItem.id) },
          {
            id: 'clipboard-pin-unpin',
            label: selectedItem.pinned ? 'Unpin Selected Item' : 'Pin Selected Item',
            onExecute: () => {
              if (selectedItem.pinned) handleUnpin(selectedItem.id)
              else handlePin(selectedItem.id)
            },
          },
        ]
      : []
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [selectedIndex, filteredItems])
}
