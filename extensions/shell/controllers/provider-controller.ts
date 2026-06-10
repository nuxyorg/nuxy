import type { ReactiveController, ReactiveControllerHost } from '@nuxy/core'
import type { Provider, Tool, ProviderState, ListItem } from '../types.ts'
import { buildOmnibarSections, type OmnibarSection } from '../utils/listResults.ts'

export class ProviderController implements ReactiveController {
  private _providers: Provider[] = []
  private _providerStates: Record<string, ProviderState> = {}
  private _omnibarSections: OmnibarSection[] = []
  private _listResults: ListItem[] = []
  private _isAnyListProviderLoading = false
  private _queryGeneration = 0
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null

  get providers(): Provider[] {
    return this._providers
  }
  get providerStates(): Record<string, ProviderState> {
    return this._providerStates
  }
  get omnibarSections(): OmnibarSection[] {
    return this._omnibarSections
  }
  get listResults(): ListItem[] {
    return this._listResults
  }
  get isAnyListProviderLoading(): boolean {
    return this._isAnyListProviderLoading
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  setProviders(providers: Provider[]): void {
    this._providers = providers
    this.host.requestUpdate()
  }

  clearProviderStates(): void {
    this._providerStates = {}
    this._isAnyListProviderLoading = false
    this.host.requestUpdate()
  }

  recompute(tools: Tool[], savedQuery: string, recentToolIds: string[]): void {
    const { sections, flatItems } = buildOmnibarSections(
      tools,
      savedQuery,
      this._providerStates,
      recentToolIds,
      this._providers
    )
    this._omnibarSections = sections
    this._listResults = flatItems
    this._isAnyListProviderLoading = Object.values(this._providerStates).some(
      (s) => s.type === 'list' && s.loading
    )
    this.host.requestUpdate()
  }

  sync(query: string, activeTool: string | null, tools: Tool[], recentToolIds: string[]): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer)

    if (activeTool || query.trim().length === 0) {
      this.clearProviderStates()
      this.recompute(tools, query, recentToolIds)
      return
    }

    const generation = ++this._queryGeneration
    this._debounceTimer = setTimeout(() => {
      const initialStates: Record<string, ProviderState> = {}
      this._providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        initialStates[provider.id] = { loading: true, items: [], type, name }
      })
      this._providerStates = initialStates
      this._isAnyListProviderLoading = Object.values(this._providerStates).some(
        (s) => s.type === 'list' && s.loading
      )
      this.recompute(tools, query, recentToolIds)

      this._providers.forEach((provider) => {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        window.core?.ipc
          ?.invoke(provider.id, 'eval', { text: query })
          .then((res: unknown) => {
            if (generation !== this._queryGeneration) return
            const r = res as { success: boolean; data?: { items?: ProviderState['items'] } } | null
            this._providerStates = {
              ...this._providerStates,
              [provider.id]: {
                loading: false,
                items: r?.success && r.data?.items ? r.data.items : [],
                type,
                name,
              },
            }
            this.recompute(tools, query, recentToolIds)
          })
          .catch(() => {
            if (generation !== this._queryGeneration) return
            this._providerStates = {
              ...this._providerStates,
              [provider.id]: { loading: false, items: [], type, name },
            }
            this.recompute(tools, query, recentToolIds)
          })
      })
    }, 50)
  }
}
