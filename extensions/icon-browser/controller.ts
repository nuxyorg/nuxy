import { createStore, type Store } from '@nuxyorg/extension-sdk'

export interface IconBrowserState {
  icons: string[]
  filtered: string[]
  query: string
  ready: boolean
  activeIndex: number
}

export class IconBrowserController {
  readonly store: Store<IconBrowserState>
  readonly svgCache = new Map<string, string>()

  constructor(private onUpdate: () => void) {
    this.store = createStore<IconBrowserState>({
      icons: [],
      filtered: [],
      query: '',
      ready: false,
      activeIndex: -1,
    })
    this.store.subscribe(() => this.onUpdate())
  }

  get state(): IconBrowserState {
    return this.store.getState()
  }

  connect(): void {
    void this.load()
  }

  disconnect(): void {
    // no-op — grid owns keyboard registration
  }

  setQuery(query: string): void {
    this.store.setState({ query })
    this.syncFiltered()
  }

  setActiveIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.activeIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ activeIndex: next })
    window.core?.shell?.refreshKeyHints()
  }

  private async load(): Promise<void> {
    try {
      const res = (await window.core?.ipc?.invoke('kernel', 'getIconPack', {})) as
        | { success: boolean; data?: { extId?: string; icons?: unknown } }
        | null
        | undefined
      const data = res?.success ? res.data : undefined
      const icons = data && Array.isArray(data.icons) ? [...(data.icons as string[])].sort() : []
      this.store.setState({ icons })
      this.syncFiltered()
      if (icons.length && data?.extId) {
        await this.fetchAllIconSources(icons, data.extId)
      }
    } catch {
      this.store.setState({ icons: [] })
      this.syncFiltered()
    }
    this.store.setState({ ready: true })
  }

  private async fetchAllIconSources(names: string[], extId: string): Promise<void> {
    await Promise.all(
      names.map(async (name) => {
        try {
          const res = await fetch(`nuxy-ext://${extId}/icons/${name}.svg`)
          if (res.ok) this.svgCache.set(name, await res.text())
        } catch {
          // ignore failed icons
        }
      })
    )
  }

  private syncFiltered(): void {
    const { icons, query } = this.state
    const q = query.trim().toLowerCase()
    const filtered = q ? icons.filter((n) => n.includes(q)) : icons
    this.store.setState({ filtered, activeIndex: -1 })
  }
}
