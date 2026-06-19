import type { ExtensionManifest, ShellKeyAction, TemplateResult } from '@nuxyorg/core'
import { render, html } from '@nuxyorg/core'
import {
  completeToolAction,
  setToolSearchPlaceholder,
  BaseExtensionController,
} from '@nuxyorg/extension-sdk'
import manifestJson from './manifest.json'
import type { NyaaResult } from './types.ts'

const EXT_ID = 'com.nuxy.nyaa'
const manifest = manifestJson as ExtensionManifest

export type EnterAction = 'copyMagnet' | 'downloadTorrent'

export interface NyaaState {
  query: string
  results: NyaaResult[]
  loading: boolean
  error: string | null
  selectedIndex: number
  multiSelectMode: boolean
  checkedIds: Set<string>
  copiedId: string | null
  enterAction: EnterAction
}

export class NyaaController extends BaseExtensionController<NyaaState> {
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private searchGen = 0
  private copiedTimer: ReturnType<typeof setTimeout> | null = null
  private omniPortalHost: HTMLDivElement | null = null

  setOmniPortalHost(host: HTMLDivElement | null): void {
    this.omniPortalHost = host
    if (host) window.core?.shell?.setOmniBarPortal(host)
  }

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        query: '',
        results: [],
        loading: false,
        error: null,
        selectedIndex: -1,
        multiSelectMode: false,
        checkedIds: new Set(),
        copiedId: null,
        enterAction: 'copyMagnet',
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return

    this.syncSearchPlaceholder()

    window.core.ipc
      .invoke(EXT_ID, 'getEnterAction', {})
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: string } | null
        if (r?.success && (r.data === 'copyMagnet' || r.data === 'downloadTorrent')) {
          this.store.setState({ enterAction: r.data })
        }
      })
      .catch(() => {})

    this.bindKeyboard()
  }

  disconnect(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    this.setOmniBarPortal(null)
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerActions([])
    window.core?.shell?.registerKeyActions(null)
  }

  setQuery(query: string): void {
    if (this.state.query === query) return
    this.store.setState({
      query,
      selectedIndex: -1,
      multiSelectMode: false,
      checkedIds: new Set(),
    })
    this.syncSearch()
    window.core?.shell?.refreshKeyHints()
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshKeyHints()
  }

  toggleCheck(id: string): void {
    const next = new Set(this.state.checkedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.store.setState({ checkedIds: next })
    window.core?.shell?.refreshKeyHints()
  }

  setMultiSelectMode(val: boolean): void {
    this.store.setState({
      multiSelectMode: val,
      checkedIds: val ? this.state.checkedIds : new Set(),
    })
    window.core?.shell?.refreshKeyHints()
  }

  handleCopyMagnet(id: string, magnet: string): void {
    window.core.ipc
      .invoke(EXT_ID, 'copyMagnet', { magnet })
      .then(() => {
        this.store.setState({ copiedId: id })
        if (this.copiedTimer) clearTimeout(this.copiedTimer)
        this.copiedTimer = setTimeout(() => this.store.setState({ copiedId: null }), 2000)
        completeToolAction(manifest)
      })
      .catch(() => {})
  }

  handleDownloadTorrent(id: string): void {
    window.core.ipc
      .invoke(EXT_ID, 'downloadTorrent', { id })
      .then(() => completeToolAction(manifest))
      .catch(() => {})
  }

  handleCopyMagnets(items: Array<{ id: string; magnet: string }>): void {
    window.core.ipc
      .invoke(EXT_ID, 'copyMagnets', { magnets: items.map((i) => i.magnet) })
      .then(() => completeToolAction(manifest))
      .catch(() => {})
  }

  handleDownloadTorrents(ids: string[]): void {
    window.core.ipc
      .invoke(EXT_ID, 'downloadTorrents', { ids })
      .then(() => completeToolAction(manifest))
      .catch(() => {})
  }

  private setOmniBarPortal(template: TemplateResult | null): void {
    const shell = window.core?.shell
    if (!shell) return
    if (!this.omniPortalHost) return
    if (!template) {
      render(html``, this.omniPortalHost)
      shell.setOmniBarPortal(null)
      return
    }
    shell.setOmniBarPortal(this.omniPortalHost)
    render(template, this.omniPortalHost)
  }

  private syncSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    const { query } = this.state

    if (!query.trim()) {
      this.store.setState({ results: [], loading: false, error: null })
      this.setOmniBarPortal(null)
      return
    }

    const generation = ++this.searchGen
    this.store.setState({ error: null, loading: true })
    this.setOmniBarPortal(html`<nuxy-spinner size="sm"></nuxy-spinner>`)

    this.searchTimer = setTimeout(() => {
      if (generation !== this.searchGen) return
      window.core.ipc
        .invoke(EXT_ID, 'search', { query })
        .then((res) => {
          if (generation !== this.searchGen) return
          const r = res as { success: boolean; data?: NyaaResult[]; error?: string } | null
          if (r?.success) {
            this.store.setState({ results: r.data ?? [], loading: false })
          } else {
            this.store.setState({
              error: r?.error ?? 'Search failed',
              results: [],
              loading: false,
            })
          }
          this.setOmniBarPortal(null)
        })
        .catch((err: Error) => {
          if (generation !== this.searchGen) return
          this.store.setState({
            error: err?.message ?? 'Search failed',
            results: [],
            loading: false,
          })
          this.setOmniBarPortal(null)
        })
    }, 1000)
  }

  private getKeyActions(): ShellKeyAction[] {
    const { multiSelectMode, enterAction } = this.state
    const t = this.t.t

    const enterLabel = multiSelectMode
      ? t('actions.checkToggle')
      : enterAction === 'copyMagnet'
        ? t('actions.copyMagnet')
        : t('actions.downloadTorrent')

    const shiftEnterLabel = !multiSelectMode
      ? enterAction === 'copyMagnet'
        ? t('actions.downloadTorrent')
        : t('actions.copyMagnet')
      : ''

    return [
      {
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        handler: () => {
          if (this.state.results.length === 0) return
          this.setSelectedIndex((prev) => (prev <= 0 ? -1 : prev - 1))
        },
      },
      {
        key: 'ArrowDown',
        label: '',
        handler: () => {
          if (this.state.results.length === 0) return
          this.setSelectedIndex((prev) => Math.min(prev + 1, this.state.results.length - 1))
        },
      },
      {
        key: 'Enter',
        label: enterLabel,
        hint: '↵',
        activeOn: () => this.state.selectedIndex >= 0,
        handler: () => {
          const idx = this.state.selectedIndex
          const item = this.state.results[idx]
          if (!item) return
          if (this.state.multiSelectMode) {
            this.toggleCheck(item.id)
            return
          }
          if (this.state.enterAction === 'copyMagnet') {
            this.handleCopyMagnet(item.id, item.magnet)
          } else {
            this.handleDownloadTorrent(item.id)
          }
        },
      },
      {
        key: 'Enter',
        modifiers: ['shift'],
        label: shiftEnterLabel,
        hint: ['⇧', '↵'],
        activeOn: () => this.state.selectedIndex >= 0 && !this.state.multiSelectMode,
        handler: () => {
          const idx = this.state.selectedIndex
          const item = this.state.results[idx]
          if (!item) return
          if (this.state.enterAction === 'copyMagnet') {
            this.handleDownloadTorrent(item.id)
          } else {
            this.handleCopyMagnet(item.id, item.magnet)
          }
        },
      },
    ]
  }

  private registerShellActions(): void {
    const { results, selectedIndex, multiSelectMode, checkedIds, enterAction } = this.state
    const t = this.t.t
    const actions: Array<{ id: string; label: string; section?: string; onExecute: () => void }> =
      []

    if (!multiSelectMode) {
      if (results.length > 0) {
        actions.push({
          id: 'nyaa-select-multiple',
          label: t('actions.selectMultiple'),
          section: 'actions',
          onExecute: () => this.setMultiSelectMode(true),
        })
      }
      const item = selectedIndex >= 0 ? results[selectedIndex] : null
      if (item) {
        if (enterAction === 'copyMagnet') {
          actions.push({
            id: 'nyaa-copy-magnet',
            label: t('actions.copyMagnetLabel'),
            section: 'actions',
            onExecute: () => this.handleCopyMagnet(item.id, item.magnet),
          })
        } else {
          actions.push({
            id: 'nyaa-download-torrent',
            label: t('actions.downloadTorrentLabel'),
            section: 'actions',
            onExecute: () => this.handleDownloadTorrent(item.id),
          })
        }
      }
    } else {
      actions.push({
        id: 'nyaa-exit-select',
        label: t('actions.exitSelectMultiple'),
        section: 'actions',
        onExecute: () => this.setMultiSelectMode(false),
      })
      const checkedItems = results.filter((r) => checkedIds.has(r.id))
      if (checkedItems.length > 0) {
        actions.push({
          id: 'nyaa-copy-all',
          label: t('actions.copyAll'),
          section: 'actions',
          onExecute: () => this.handleCopyMagnets(checkedItems),
        })
        actions.push({
          id: 'nyaa-download-all',
          label: t('actions.downloadAll'),
          section: 'actions',
          onExecute: () => this.handleDownloadTorrents(checkedItems.map((i) => i.id)),
        })
      }
    }

    window.core?.shell?.registerActions(actions)
  }

  private bindKeyboard(): void {
    window.core?.shell?.registerKeyActions(() => this.getKeyActions())
    this.store.subscribe(() => {
      this.registerShellActions()
      window.core?.shell?.refreshKeyHints()
    })
    this.cleanups.push(() => {
      window.core?.shell?.registerKeyActions(null)
      window.core?.shell?.registerActions([])
    })
  }
}
