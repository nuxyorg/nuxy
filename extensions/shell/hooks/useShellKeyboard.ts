const React = window.React

import type { ListItem } from '../types.ts'

interface Params {
  activeTool: string | null
  query: string
  savedQuery: string
  selectedIndex: number
  listResults: ListItem[]
  selectionSourceRef: React.MutableRefObject<'type' | 'nav'>
  setActiveTool: React.Dispatch<React.SetStateAction<string | null>>
  setToolComponent: React.Dispatch<
    React.SetStateAction<React.ComponentType<{ query: string; extensionId?: string }> | null>
  >
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setSavedQuery: React.Dispatch<React.SetStateAction<string>>
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  tryOrchestratorRoute: () => Promise<void>
  handleItemClick: (item: ListItem) => Promise<void>
}

export function useShellKeyboard({
  activeTool,
  query,
  savedQuery,
  selectedIndex,
  listResults,
  selectionSourceRef,
  setActiveTool,
  setToolComponent,
  setQuery,
  setSavedQuery,
  setSelectedIndex,
  tryOrchestratorRoute,
  handleItemClick,
}: Params): { handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void } {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (activeTool && query === '' && e.key === 'Backspace') {
      e.preventDefault()
      setActiveTool(null)
      setToolComponent(null)
      setQuery('')
      setSavedQuery('')
      setSelectedIndex(0)
      return
    }

    // If inside a tool, global useKeyboard in hooks.tsx handles forwarding — skip here
    if (activeTool) return

    if (e.key === 'Enter' && (selectedIndex < 0 || !listResults[selectedIndex]) && savedQuery.trim()) {
      void tryOrchestratorRoute()
    }
    if (listResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectionSourceRef.current = 'nav'
      setSelectedIndex((prev) => {
        const next = prev + 1
        return next < listResults.length ? next : prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectionSourceRef.current = 'nav'
      setSelectedIndex((prev) => {
        const next = prev - 1
        return next >= -1 ? next : prev
      })
    } else if (e.key === 'ArrowRight') {
      if (selectedIndex >= 0 && listResults[selectedIndex]) {
        e.preventDefault()
        setSavedQuery(listResults[selectedIndex].title)
        setQuery(listResults[selectedIndex].title)
        setSelectedIndex(-1)
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && listResults[selectedIndex]) {
        e.preventDefault()
        void handleItemClick(listResults[selectedIndex])
      }
    }
  }

  return { handleKeyDown }
}
