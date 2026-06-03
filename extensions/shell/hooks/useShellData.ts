const React = window.React

import type {
  Tool,
  Provider,
  Orchestrator,
  ShellConfig,
  ProviderState,
  ListItem,
} from '../types.ts'
import { buildListResults } from '../utils/listResults.ts'

interface UseShellInitParams {
  cfgRef: React.MutableRefObject<ShellConfig | null>
  setTools: (tools: Tool[]) => void
  setProviders: (providers: Provider[]) => void
  setOrchestrators: (orchestrators: Orchestrator[]) => void
  setThemeStyles: (styles: Record<string, string> | null) => void
  setSettings: (settings: ShellConfig | null) => void
  setSearchIcon: (icon: string | null) => void
  SHELL_EXT_ID: string
}

interface UseProvidersParams {
  activeTool: string | null
  savedQuery: string
  providers: Provider[]
  providerStates: Record<string, ProviderState>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, ProviderState>>>
  queryGeneration: React.MutableRefObject<number>
}

interface Deps {
  useShellInit: (params: UseShellInitParams) => void
  useProviders: (params: UseProvidersParams) => { isAnyListProviderLoading: boolean }
  useToolHistory: (shellExtId: string) => {
    recentToolIds: string[]
    recordToolUsed: (toolId: string) => void
  }
  SHELL_EXT_ID: string
}

interface Params {
  activeTool: string | null
  savedQuery: string
  queryGeneration: React.MutableRefObject<number>
  deps: Deps
}

interface ShellData {
  tools: Tool[]
  providers: Provider[]
  orchestrators: Orchestrator[]
  themeStyles: Record<string, string> | null
  settings: ShellConfig
  searchIcon: string | null
  providerStates: Record<string, ProviderState>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, ProviderState>>>
  recentToolIds: string[]
  recordToolUsed: (toolId: string) => void
  isAnyListProviderLoading: boolean
  listResults: ListItem[]
  cfgRef: React.MutableRefObject<ShellConfig | null>
  setSettings: React.Dispatch<React.SetStateAction<ShellConfig>>
  setTools: React.Dispatch<React.SetStateAction<Tool[]>>
  setProviders: React.Dispatch<React.SetStateAction<Provider[]>>
  setOrchestrators: React.Dispatch<React.SetStateAction<Orchestrator[]>>
  setThemeStyles: React.Dispatch<React.SetStateAction<Record<string, string> | null>>
  setSearchIcon: React.Dispatch<React.SetStateAction<string | null>>
}

const DEFAULT_SETTINGS: ShellConfig = {
  windowWidth: 800,
  windowMaxHeight: 600,
  opacity: 1,
  theme: 'dark',
  zoom: '100%',
  font: 'system',
  windowPosition: '1/2, 1/3',
}

export function useShellData({ activeTool, savedQuery, queryGeneration, deps }: Params): ShellData {
  const { useShellInit, useProviders, useToolHistory, SHELL_EXT_ID } = deps

  const cfgRef = React.useRef<ShellConfig | null>(null)
  const [tools, setTools] = React.useState<Tool[]>([])
  const [providers, setProviders] = React.useState<Provider[]>([])
  const [orchestrators, setOrchestrators] = React.useState<Orchestrator[]>([])
  const [themeStyles, setThemeStyles] = React.useState<Record<string, string> | null>(null)
  const [settings, setSettings] = React.useState<ShellConfig>(DEFAULT_SETTINGS)
  const [searchIcon, setSearchIcon] = React.useState<string | null>(null)
  const [providerStates, setProviderStates] = React.useState<Record<string, ProviderState>>({})

  useShellInit({
    cfgRef,
    setTools,
    setProviders,
    setOrchestrators,
    setThemeStyles,
    setSettings,
    setSearchIcon,
    SHELL_EXT_ID,
  })

  const { isAnyListProviderLoading } = useProviders({
    activeTool,
    savedQuery,
    providers,
    providerStates,
    setProviderStates,
    queryGeneration,
  })

  const { recentToolIds, recordToolUsed } = useToolHistory(SHELL_EXT_ID)

  const listResults = React.useMemo<ListItem[]>(
    () => buildListResults(tools, savedQuery, providerStates, recentToolIds),
    [tools, savedQuery, providerStates, recentToolIds]
  )

  return {
    tools,
    providers,
    orchestrators,
    themeStyles,
    settings,
    searchIcon,
    providerStates,
    setProviderStates,
    recentToolIds,
    recordToolUsed,
    isAnyListProviderLoading,
    listResults,
    cfgRef,
    setSettings,
    setTools,
    setProviders,
    setOrchestrators,
    setThemeStyles,
    setSearchIcon,
  }
}
