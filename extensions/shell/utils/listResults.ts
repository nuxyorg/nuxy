import type { Tool, ListItem, ProviderState, Provider } from '../types.ts'

export interface OmnibarSection {
  id: string
  label: string
  items: ListItem[]
  loading?: boolean
}

export interface OmnibarSectionsResult {
  sections: OmnibarSection[]
  flatItems: ListItem[]
}

const DEFAULT_GROUP_LABELS: Record<string, string> = {
  actions: 'Actions',
}

function filterTools(tools: Tool[], savedQuery: string, recentToolIds: string[]): ListItem[] {
  const toolItems: ListItem[] = tools.map((t) => ({
    id: t.id,
    title: t.manifest.name,
    subtitle: (t.manifest as { id?: string }).id || 'Tool',
    isTool: true,
    value: t.manifest.name,
  }))

  if (savedQuery.trim().length > 0) {
    return toolItems.filter(
      (item) =>
        item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(savedQuery.toLowerCase())
    )
  }

  if (recentToolIds.length > 0) {
    const recentSet = new Set(recentToolIds)
    const recent = [...new Set(recentToolIds)]
      .map((id) => toolItems.find((t) => t.id === id))
      .filter((x): x is ListItem => Boolean(x))
    const rest = toolItems.filter((t) => !recentSet.has(t.id))
    return [...recent, ...rest]
  }

  return toolItems
}

function itemDedupeKey(item: ListItem): string {
  if (item.execute) return `execute:${item.id}:${item.execute.channel}`
  return item.id
}

function dedupeItems(items: ListItem[], seenKeys: Set<string>): ListItem[] {
  const out: ListItem[] = []
  for (const item of items) {
    const key = itemDedupeKey(item)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    out.push(item)
  }
  return out
}

export function buildOmnibarSections(
  tools: Tool[],
  savedQuery: string,
  providerStates: Record<string, ProviderState>,
  recentToolIds: string[],
  providers: Provider[] = []
): OmnibarSectionsResult {
  const sections: OmnibarSection[] = []
  const seenKeys = new Set<string>()

  const filteredTools = dedupeItems(filterTools(tools, savedQuery, recentToolIds), seenKeys)
  if (filteredTools.length > 0) {
    sections.push({ id: 'tools', label: 'Tools', items: filteredTools })
  }

  const providerOrder =
    providers.length > 0 ? providers.map((p) => p.id) : Object.keys(providerStates)
  const sectionByKey = new Map<string, OmnibarSection>()

  for (const provId of providerOrder) {
    const state = providerStates[provId]
    if (!state || state.type !== 'list') continue

    const provider = providers.find((p) => p.id === provId)
    const groupKey = provider?.manifest?.providerGroup
    const sectionKey = groupKey || provId
    const sectionLabel = groupKey
      ? (provider?.manifest?.providerGroupLabel ?? DEFAULT_GROUP_LABELS[groupKey] ?? groupKey)
      : state.name

    const hasItems = Boolean(state.items && state.items.length > 0)
    if (!state.loading && !hasItems) continue

    const items = state.loading || !state.items ? [] : dedupeItems(state.items, seenKeys)

    let section = sectionByKey.get(sectionKey)
    if (!section) {
      section = {
        id: sectionKey,
        label: sectionLabel,
        items: [],
        loading: false,
      }
      sectionByKey.set(sectionKey, section)
      sections.push(section)
    }

    if (state.loading) section.loading = true
    section.items.push(...items)
  }

  const flatItems = sections.flatMap((s) => s.items)
  return { sections, flatItems }
}

export function buildListResults(
  tools: Tool[],
  savedQuery: string,
  providerStates: Record<string, ProviderState>,
  recentToolIds: string[]
): ListItem[] {
  return buildOmnibarSections(tools, savedQuery, providerStates, recentToolIds).flatItems
}
