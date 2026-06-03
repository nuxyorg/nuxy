const React = window.React

import type { ExtensionListItem } from '../types.ts'
import { filterExtensions, buildNavSections } from '../utils/storeFilter.ts'

interface NavSection {
  id: string
  label: string
  itemCount: number
}

interface Params {
  extensions: ExtensionListItem[]
  activeTab: string
  query: string
  selectedIndex: number
}

interface StoreDerivedData {
  filteredExtensions: ExtensionListItem[]
  navSections: NavSection[]
  selectedExtension: ExtensionListItem | null
}

export function useStoreDerivedData({ extensions, activeTab, query, selectedIndex }: Params): StoreDerivedData {
  const filteredExtensions = React.useMemo(
    () => filterExtensions(extensions, activeTab, query),
    [extensions, activeTab, query]
  )

  const navSections = React.useMemo(() => buildNavSections(extensions), [extensions])

  const selectedExtension = React.useMemo(
    () =>
      selectedIndex >= 0 && selectedIndex < filteredExtensions.length
        ? filteredExtensions[selectedIndex]
        : null,
    [selectedIndex, filteredExtensions]
  )

  return { filteredExtensions, navSections, selectedExtension }
}
