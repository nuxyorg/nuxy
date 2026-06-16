import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'
import type { Provider, Tool, ProviderState, ListItem, UsageStats } from '../types.ts'
import { buildOmnibarSections, type OmnibarSection } from '../utils/listResults.ts'

interface SyncOptions {
  /** When true, only non-action providers are evaluated (debounced list/search providers). */
  skipActionProviders?: boolean
}

export class ProviderController implements ReactiveController {
  private _providers: Provider[] = []
  private _providerStates: Record<string, ProviderState> = {}
  private _omnibarSections: OmnibarSection[] = []
  private _listResults: ListItem[] = []
  private _isAnyListProviderLoading = false
  private _queryGeneration = 0
  private _actionQueryGeneration = 0
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null
  private _loadingTimers: ReturnType<typeof setTimeout>[] = []
  private _actionLoadingTimers: ReturnType<typeof setTimeout>[] = []

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

  hostConnected(): void {}

  setProviders(providers: Provider[]): void {
    this._providers = providers
    this.host.requestUpdate()
  }

  clearProviderStates(): void {
    this._providerStates = {}
    this._isAnyListProviderLoading = false
    this.host.requestUpdate()
  }

  recompute(
    tools: Tool[],
    savedQuery: string,
    recentToolIds: string[],
    usageStats: UsageStats = {}
  ): void {
    const { sections, flatItems } = buildOmnibarSections(
      tools,
      savedQuery,
      this._providerStates,
      recentToolIds,
      this._providers,
      usageStats
    )
    this._omnibarSections = sections
    this._listResults = flatItems
    this._isAnyListProviderLoading = Object.values(this._providerStates).some(
      (s) => s.type === 'list' && s.loading
    )
    this.host.requestUpdate()
  }

  private _isActionProvider(provider: Provider): boolean {
    return Boolean(provider.manifest?.providerGroup)
  }

  private _clearActionProviderStates(
    tools: Tool[],
    query: string,
    recentToolIds: string[],
    usageStats: UsageStats = {}
  ): void {
    const actionProviders = this._providers.filter((p) => this._isActionProvider(p))
    if (actionProviders.length === 0) return

    const hasActionState = actionProviders.some((p) => this._providerStates[p.id])
    if (!hasActionState) return

    this._actionQueryGeneration++
    this._actionLoadingTimers.forEach(clearTimeout)
    this._actionLoadingTimers = []

    const nextStates = { ...this._providerStates }
    for (const provider of actionProviders) {
      delete nextStates[provider.id]
    }
    this._providerStates = nextStates
    this.recompute(tools, query, recentToolIds, usageStats)
  }

  /** Immediate eval for action providers (e.g. Save as note). */
  syncActions(
    query: string,
    activeTool: string | null,
    tools: Tool[],
    recentToolIds: string[],
    usageStats: UsageStats = {}
  ): void {
    if (activeTool || query.trim().length === 0) {
      this._clearActionProviderStates(tools, query, recentToolIds, usageStats)
      return
    }

    const actionProviders = this._providers.filter((p) => this._isActionProvider(p))
    if (actionProviders.length === 0) return

    this._actionLoadingTimers.forEach(clearTimeout)
    this._actionLoadingTimers = []

    const generation = ++this._actionQueryGeneration
    const nextStates = { ...this._providerStates }
    for (const provider of actionProviders) {
      const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
      const name = provider.manifest?.name || provider.id
      const existing = this._providerStates[provider.id]
      nextStates[provider.id] = {
        loading: true,
        items: existing?.items ?? [],
        type,
        name,
      }
    }
    this._providerStates = nextStates
    this.recompute(tools, query, recentToolIds, usageStats)

    for (const provider of actionProviders) {
      this._invokeProviderEval(
        provider,
        query,
        generation,
        tools,
        recentToolIds,
        usageStats,
        this._actionLoadingTimers,
        () => this._actionQueryGeneration
      )
    }
  }

  sync(
    query: string,
    activeTool: string | null,
    tools: Tool[],
    recentToolIds: string[],
    usageStats: UsageStats = {},
    options: SyncOptions = {}
  ): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    if (!options.skipActionProviders) {
      this._loadingTimers.forEach(clearTimeout)
      this._loadingTimers = []
    }

    if (activeTool || query.trim().length === 0) {
      this.clearProviderStates()
      this.recompute(tools, query, recentToolIds, usageStats)
      return
    }

    const targets = options.skipActionProviders
      ? this._providers.filter((p) => !this._isActionProvider(p))
      : this._providers
    if (targets.length === 0) return

    const generation = ++this._queryGeneration
    this._debounceTimer = setTimeout(() => {
      const nextStates = options.skipActionProviders ? { ...this._providerStates } : {}
      for (const provider of targets) {
        const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
        const name = provider.manifest?.name || provider.id
        const existing = this._providerStates[provider.id]
        nextStates[provider.id] = {
          loading: true,
          items: existing?.items ?? [],
          type,
          name,
        }
      }
      this._providerStates = nextStates
      this._isAnyListProviderLoading = Object.values(nextStates).some(
        (s) => s.type === 'list' && s.loading
      )
      this.recompute(tools, query, recentToolIds, usageStats)

      for (const provider of targets) {
        this._invokeProviderEval(
          provider,
          query,
          generation,
          tools,
          recentToolIds,
          usageStats,
          this._loadingTimers,
          () => this._queryGeneration
        )
      }
    }, 50)
  }

  private _invokeProviderEval(
    provider: Provider,
    query: string,
    generation: number,
    tools: Tool[],
    recentToolIds: string[],
    usageStats: UsageStats,
    loadingTimers: ReturnType<typeof setTimeout>[],
    currentGeneration: () => number
  ): void {
    const type = (provider.manifest?.providerType as ProviderState['type']) || 'list'
    const name = provider.manifest?.name || provider.id

    // Delay skeleton — only show if provider takes longer than 150ms and has no stale items
    const loadingTimer = setTimeout(() => {
      if (generation !== currentGeneration()) return
      const existing = this._providerStates[provider.id]
      if (existing?.items?.length) return
      this._providerStates = {
        ...this._providerStates,
        [provider.id]: { loading: true, items: [], type, name },
      }
      this._isAnyListProviderLoading = Object.values(this._providerStates).some(
        (s) => s.type === 'list' && s.loading
      )
      this.recompute(tools, query, recentToolIds, usageStats)
    }, 150)
    loadingTimers.push(loadingTimer)

    window.core?.ipc
      ?.invoke(provider.id, 'eval', { text: query })
      .then((res: unknown) => {
        clearTimeout(loadingTimer)
        if (generation !== currentGeneration()) return
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
        this.recompute(tools, query, recentToolIds, usageStats)
      })
      .catch(() => {
        clearTimeout(loadingTimer)
        if (generation !== currentGeneration()) return
        this._providerStates = {
          ...this._providerStates,
          [provider.id]: { loading: false, items: [], type, name },
        }
        this.recompute(tools, query, recentToolIds, usageStats)
      })
  }
}
