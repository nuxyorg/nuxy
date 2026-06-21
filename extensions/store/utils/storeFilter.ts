import type { ExtensionListItem } from '../types.ts'

export interface StoreTab {
  id: string
  label: string
}

export interface NavSection {
  id: string
  label: string
  itemCount: number
}

export const TABS: StoreTab[] = [
  { id: 'all', label: 'All Extensions' },
  { id: 'tool', label: 'Tools' },
  { id: 'theme', label: 'Themes' },
  { id: 'iconpack', label: 'Icon Packs' },
  { id: 'installed', label: 'Installed' },
  { id: 'updates', label: 'Updates' },
]

function matchesTab(ext: ExtensionListItem, tabId: string): boolean {
  if (tabId === 'installed') return ext.installed
  if (tabId === 'updates') return ext.canUpdate
  if (tabId === 'all') return true
  return ext.type === tabId
}

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
    if (!matchesTab(ext, activeTab)) return false

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
export function buildNavSections(extensions: ExtensionListItem[]): NavSection[] {
  return TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    itemCount: extensions.filter((ext) => matchesTab(ext, tab.id)).length,
  }))
}

/**
 * Serializes nav sections into the JSON string `nuxy-tab-bar` expects for its
 * `tabs` attribute (it parses the attribute value with `JSON.parse`, not a live array).
 */
export function serializeTabs(sections: NavSection[]): string {
  return JSON.stringify(sections.map((s) => ({ id: s.id, label: `${s.label} (${s.itemCount})` })))
}

/**
 * Returns the `nuxy-tag` variant for a given permission string.
 * Pure — no UI dependencies.
 */
export function permissionVariant(perm: string): 'default' | 'blue' | 'green' | 'orange' | 'red' {
  if (perm === 'shell' || perm === 'fs') return 'red'
  if (perm === 'network' || perm === 'clipboard') return 'orange'
  if (perm === 'storage' || perm === 'db') return 'green'
  return 'default'
}
