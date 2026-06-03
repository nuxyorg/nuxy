const React = window.React

import type { ExtensionListItem } from '../types.ts'
import { TABS } from '../utils/storeFilter.ts'

interface StateRef {
  selectedIndex: number
}

interface Nav {
  setFocusArea: (area: 'left' | 'right') => void
  goToSection: (id: string) => void
}

interface Params {
  filteredExtensions: ExtensionListItem[]
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  stateRef: React.MutableRefObject<StateRef>
  nav: Nav
  handleInstall: (ext: ExtensionListItem) => Promise<void>
  handleUninstall: (ext: ExtensionListItem) => Promise<void>
  loadCatalog: () => Promise<void>
}

export function buildStoreRightPanelActions({
  filteredExtensions,
  setSelectedIndex,
  setActiveTab,
  stateRef,
  nav,
  handleInstall,
  handleUninstall,
  loadCatalog,
}: Params) {
  return [
    {
      key: 'ArrowUp',
      label: 'Navigate list',
      hint: '↑↓',
      handler: () => {
        setSelectedIndex((idx) => (idx <= 0 ? 0 : idx - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: 'Navigate list',
      handler: () => {
        setSelectedIndex((idx) => {
          const maxIdx = filteredExtensions.length - 1
          return idx >= maxIdx ? maxIdx : idx + 1
        })
      },
    },
    {
      key: 'i',
      label: 'Install / Update',
      hint: 'I',
      activeOn: () => {
        const item = filteredExtensions[stateRef.current.selectedIndex]
        return !!(item && (!item.installed || item.canUpdate))
      },
      handler: () => {
        const item = filteredExtensions[stateRef.current.selectedIndex]
        if (item) void handleInstall(item)
      },
    },
    {
      key: 'u',
      label: 'Uninstall',
      hint: 'U',
      activeOn: () => {
        const item = filteredExtensions[stateRef.current.selectedIndex]
        return !!(item && item.installed && !item.isSystem)
      },
      handler: () => {
        const item = filteredExtensions[stateRef.current.selectedIndex]
        if (item) void handleUninstall(item)
      },
    },
    {
      key: 'r',
      label: 'Refresh store',
      hint: 'R',
      handler: () => {
        void loadCatalog()
      },
    },
    {
      key: 'Enter',
      label: 'Perform Action',
      hint: '↵',
      activeOn: () => {
        const { selectedIndex } = stateRef.current
        return selectedIndex >= 0 && selectedIndex < filteredExtensions.length
      },
      handler: () => {
        const item = filteredExtensions[stateRef.current.selectedIndex]
        if (!item) return
        if (!item.installed || item.canUpdate) {
          void handleInstall(item)
        } else if (item.installed && !item.isSystem) {
          void handleUninstall(item)
        }
      },
    },
    {
      key: 'Tab',
      label: 'Next Category',
      hint: 'Tab',
      handler: () => {
        setActiveTab((prev) => {
          const idx = TABS.findIndex((t) => t.id === prev)
          const nextTab = TABS[(idx + 1) % TABS.length].id
          nav.goToSection(nextTab)
          return nextTab
        })
        setSelectedIndex(-1)
      },
    },
    {
      key: 'ArrowLeft',
      label: 'Focus Sidebar',
      handler: () => {
        nav.setFocusArea('left')
      },
    },
  ]
}
