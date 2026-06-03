import type { ExtensionListItem } from '../types.ts'

export const TABS = [
  { id: 'all', label: 'All Extensions' },
  { id: 'tool', label: 'Tools' },
  { id: 'theme', label: 'Themes' },
  { id: 'iconpack', label: 'Icon Packs' },
  { id: 'installed', label: 'Installed' },
  { id: 'updates', label: 'Updates' },
]

/**
 * Filters the extension catalog by active tab and search query.
 */
export function filterExtensions(
  extensions: ExtensionListItem[],
  activeTab: string,
  query: string
): ExtensionListItem[] {
  const q = (query || '').toLowerCase().trim()

  return extensions.filter((ext) => {
    if (activeTab === 'installed' && !ext.installed) return false
    if (activeTab === 'updates' && !ext.canUpdate) return false
    if (
      activeTab !== 'all' &&
      activeTab !== 'installed' &&
      activeTab !== 'updates' &&
      ext.type !== activeTab
    ) {
      return false
    }

    if (q !== '') {
      const nameMatch = ext.name.toLowerCase().includes(q)
      const idMatch = ext.id.toLowerCase().includes(q)
      const descMatch = ext.description.toLowerCase().includes(q)
      const authorMatch = ext.author.toLowerCase().includes(q)
      return nameMatch || idMatch || descMatch || authorMatch
    }

    return true
  })
}

/**
 * Builds the nav section list with per-tab counts for the sidebar.
 */
export function buildNavSections(extensions: ExtensionListItem[]) {
  return TABS.map((tab) => {
    const count = extensions.filter((ext) => {
      if (tab.id === 'installed' && !ext.installed) return false
      if (tab.id === 'updates' && !ext.canUpdate) return false
      if (
        tab.id !== 'all' &&
        tab.id !== 'installed' &&
        tab.id !== 'updates' &&
        ext.type !== tab.id
      ) {
        return false
      }
      return true
    }).length
    return { id: tab.id, label: tab.label, itemCount: count }
  })
}

/**
 * Returns the badge variant for a given permission string.
 * Pure — no React, no UI components.
 */
export function permissionVariant(perm: string): string {
  if (perm === 'shell' || perm === 'fs') return 'danger'
  if (perm === 'network' || perm === 'clipboard') return 'warning'
  if (perm === 'storage' || perm === 'db') return 'success'
  return 'default'
}
