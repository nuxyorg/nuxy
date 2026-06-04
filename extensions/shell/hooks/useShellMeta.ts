import type { Tool, ListItem } from '../types.ts'

interface Params {
  activeTool: string | null
  tools: Tool[]
  selectedIndex: number
  listResults: ListItem[]
  themeStyles: Record<string, string> | null
}

interface ShellMeta {
  activeToolName: string | null
  activeToolPlaceholder: string | null
  itemClass: (index: number) => string
}

export function useShellMeta({ activeTool, tools, selectedIndex, themeStyles }: Params): ShellMeta {
  const activeTool_ = activeTool ? tools.find((t) => t.id === activeTool) : null
  const activeToolName = activeTool_?.manifest.name ?? activeTool ?? null
  const activeToolPlaceholder =
    (activeTool_?.manifest as { placeholder?: string } | undefined)?.placeholder ?? null

  const itemClass = (index: number): string =>
    index === selectedIndex
      ? (themeStyles?.itemActive ?? 'nuxy-shell-results-item nuxy-shell-results-item--active')
      : (themeStyles?.itemInactive ?? 'nuxy-shell-results-item')

  return { activeToolName, activeToolPlaceholder, itemClass }
}
