import type { Tool, ListItem, ProviderState } from '../types.ts'

export function buildListResults(
  tools: Tool[],
  savedQuery: string,
  providerStates: Record<string, ProviderState>,
  recentToolIds: string[]
): ListItem[] {
  const toolItems: ListItem[] = tools.map((t) => ({
    id: t.id,
    title: t.manifest.name,
    subtitle: (t.manifest as { id?: string }).id || 'Tool',
    isTool: true,
    value: t.manifest.name,
  }))

  let filteredTools: ListItem[]
  if (savedQuery.trim().length > 0) {
    filteredTools = toolItems.filter(
      (item) =>
        item.title.toLowerCase().includes(savedQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(savedQuery.toLowerCase())
    )
  } else if (recentToolIds.length > 0) {
    const recentSet = new Set(recentToolIds)
    const recent = [...new Set(recentToolIds)]
      .map((id) => toolItems.find((t) => t.id === id))
      .filter((x): x is ListItem => Boolean(x))
    const rest = toolItems.filter((t) => !recentSet.has(t.id))
    filteredTools = [...recent, ...rest]
  } else {
    filteredTools = toolItems
  }

  const finalResults: ListItem[] = []
  const seenIds = new Set<string>()

  filteredTools.forEach((item) => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id)
      finalResults.push(item)
    }
  })

  Object.keys(providerStates).forEach((provId) => {
    const state = providerStates[provId]
    if (state && state.type === 'list' && !state.loading && state.items) {
      state.items.forEach((item) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          finalResults.push(item)
        }
      })
    }
  })

  return finalResults
}
