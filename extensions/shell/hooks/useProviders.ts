const React = window.React
const { useEffect, useMemo } = React

import type { Provider, ProviderState } from '../types.ts'

export function useProviders({
  activeTool,
  savedQuery,
  providers,
  providerStates,
  setProviderStates,
  queryGeneration,
}: {
  activeTool: string | null
  savedQuery: string
  providers: Provider[]
  providerStates: Record<string, ProviderState>
  setProviderStates: React.Dispatch<React.SetStateAction<Record<string, ProviderState>>>
  queryGeneration: React.MutableRefObject<number>
}): { isAnyListProviderLoading: boolean } {
  useEffect(() => {
    if (activeTool) {
      setProviderStates({})
      return
    }
    if (savedQuery.trim().length === 0) {
      setProviderStates({})
      return
    }

    const generation = ++queryGeneration.current

    const timer = setTimeout(() => {
      const initialStates: Record<string, ProviderState> = {}
      providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        initialStates[provider.id] = { loading: true, items: [], type, name }
      })
      setProviderStates(initialStates)

      providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        window.core?.ipc
          ?.invoke(provider.id, 'eval', { text: savedQuery })
          .then((res: unknown) => {
            if (generation !== queryGeneration.current) return
            const r = res as { success: boolean; data?: { items?: ProviderState['items'] } } | null
            setProviderStates((prev) => ({
              ...prev,
              [provider.id]: {
                loading: false,
                items: r?.success && r.data?.items ? r.data.items : [],
                type,
                name,
              },
            }))
          })
          .catch((_e: unknown) => {
            if (generation !== queryGeneration.current) return
            setProviderStates((prev) => ({
              ...prev,
              [provider.id]: { loading: false, items: [], type, name },
            }))
          })
      })
    }, 50)

    return () => clearTimeout(timer)
  }, [savedQuery, activeTool, providers])

  const isAnyListProviderLoading = useMemo(() => {
    return Object.values(providerStates).some((state) => state.type === 'list' && state.loading)
  }, [providerStates])

  return { isAnyListProviderLoading }
}
