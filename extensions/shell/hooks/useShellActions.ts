const React = window.React

import type { ListItem, Orchestrator } from '../types.ts'

interface Params {
  orchestrators: Orchestrator[]
  savedQuery: string
  setActiveTool: React.Dispatch<React.SetStateAction<string | null>>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, never>>>
  setQuery: React.Dispatch<React.SetStateAction<string>>
  setSavedQuery: React.Dispatch<React.SetStateAction<string>>
  recordToolUsed: (toolId: string) => void
  setToolComponent: React.Dispatch<
    React.SetStateAction<React.ComponentType<{ query: string; extensionId?: string }> | null>
  >
}

interface Actions {
  copiedId: string | null
  handleCopy: (id: string) => void
  openTool: (toolId: string, initialQuery?: string) => void
  handleItemClick: (item: ListItem) => Promise<void>
  tryOrchestratorRoute: () => Promise<void>
}

export function useShellActions({
  orchestrators,
  savedQuery,
  setActiveTool,
  setProviderStates,
  setQuery,
  setSavedQuery,
  recordToolUsed,
  setToolComponent,
}: Params): Actions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = (id: string): void => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const openTool = (toolId: string, initialQuery: string = ''): void => {
    setActiveTool(toolId)
    setProviderStates({} as any)
    setQuery(initialQuery)
    setSavedQuery(initialQuery)
    recordToolUsed(toolId)
    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${toolId}/frontend.js`)
      .then(
        (module: { default: React.ComponentType<{ query: string; extensionId?: string }> }) => {
          setToolComponent(() => module.default)
        }
      )
      .catch(() => {})
  }

  const handleItemClick = async (item: ListItem): Promise<void> => {
    if (item.execute) {
      try {
        const res = await window.core.ipc.invoke(item.id, item.execute.channel, item.execute.payload)
        const r = res as { success: boolean; data?: { toolId?: string; query?: string } } | null
        if (r?.success && r.data?.toolId) {
          openTool(r.data.toolId, r.data.query || '')
        }
      } catch (e) {
        console.error('Failed to execute item action:', e)
      }
    } else if (item.isTool) {
      openTool(item.id, (item as any).initialQuery || '')
    }
  }

  const tryOrchestratorRoute = async (): Promise<void> => {
    if (!savedQuery.trim() || orchestrators.length === 0) return
    try {
      const res = await window.core.ipc.invoke(orchestrators[0].id, 'route', { text: savedQuery })
      const r = res as { ok: boolean; data?: { toolCalled?: string; initialQuery?: string } } | null
      if (r?.ok && r.data?.toolCalled) {
        openTool(r.data.toolCalled, r.data.initialQuery)
      }
    } catch {
      // silently ignore orchestrator route failures
    }
  }

  return { copiedId, handleCopy, openTool, handleItemClick, tryOrchestratorRoute }
}
