import { createStore, type Store } from '@nuxyorg/extension-sdk'
import type { ShellAction } from '@nuxyorg/core'

const EXT_ID = 'com.nuxy.icon-browser'

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

  private activeName(): string | null {
    const { filtered, activeIndex } = this.state
    if (activeIndex < 0 || activeIndex >= filtered.length) return null
    return filtered[activeIndex] ?? null
  }

  async copyActiveName(): Promise<void> {
    const name = this.activeName()
    if (!name) return
    const res = (await window.core?.ipc?.invoke(EXT_ID, 'copyIconName', { name })) as
      | { success: boolean }
      | null
      | undefined
    if (res?.success) {
      window.UI?.toast?.(`Copied "${name}"`, { type: 'success' })
    }
  }

  async copyActiveSvg(): Promise<void> {
    const name = this.activeName()
    if (!name) return
    const svg = this.svgCache.get(name)
    if (!svg) return
    const res = (await window.core?.ipc?.invoke(EXT_ID, 'copyIconSvg', { svg })) as
      | { success: boolean }
      | null
      | undefined
    if (res?.success) {
      window.UI?.toast?.(`Copied SVG for "${name}"`, { type: 'success' })
    }
  }

  getKeyActions(): ShellAction[] {
    return [
      {
        key: 'Enter',
        label: 'Copy name',
        hint: '↵',
        activeOn: () => this.activeName() !== null,
        handler: () => {
          void this.copyActiveName()
        },
      },
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: 'Copy SVG',
        hint: ['⇧', '↵'],
        activeOn: () => this.activeName() !== null,
        handler: () => {
          void this.copyActiveSvg()
        },
      },
    ]
  }

  setQuery(query: string): void {
    this.store.setState({ query })
    this.syncFiltered()
  }

  setActiveIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.activeIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ activeIndex: next })
    window.core?.shell?.refreshShellActions()
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
