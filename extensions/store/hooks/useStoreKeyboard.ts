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
  t: (key: string) => string
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
  t,
}: Params) {
  return [
    {
      key: 'ArrowUp',
      label: t('actions.navigate'),
      hint: '↑↓',
      handler: () => {
        setSelectedIndex((idx) => (idx <= 0 ? 0 : idx - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: t('actions.navigate'),
      handler: () => {
        setSelectedIndex((idx) => {
          const maxIdx = filteredExtensions.length - 1
          return idx >= maxIdx ? maxIdx : idx + 1
        })
      },
    },
    {
      key: 'i',
      label: t('actions.installUpdate'),
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
      label: t('actions.uninstall'),
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
      label: t('actions.refresh'),
      hint: 'R',
      handler: () => {
        void loadCatalog()
      },
    },
    {
      key: 'Enter',
      label: t('actions.performAction'),
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
      label: t('actions.nextCategory'),
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
      label: t('actions.focusSidebar'),
      handler: () => {
        nav.setFocusArea('left')
      },
    },
  ]
}
