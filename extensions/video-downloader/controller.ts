import type { ShellAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import { invoke } from './utils/ipc.ts'
import { filterFormats } from './utils/format.ts'
import type { TabId, VideoFormat, VideoMetadata } from './types.ts'

const EXT_ID = 'com.nuxy.video-downloader'
const DOWNLOAD_MANAGER_DEEPLINK = 'nuxy://download-manager'
const TABS: { id: TabId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'video_audio', label: 'Video & Audio' },
  { id: 'audio_only', label: 'Audio Only' },
  { id: 'video_only', label: 'Video Only' },
  { id: 'all', label: 'All Streams' },
]

export interface VideoDownloaderState {
  url: string
  metadata: VideoMetadata | null
  loading: boolean
  error: string | null
  activeTab: TabId
  selectedIndex: number
  focusedPanel: 'left' | 'right'
  ytdlpInstalled: boolean | null
}

export class VideoDownloaderController extends BaseExtensionController<VideoDownloaderState> {
  static readonly tabs = TABS

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        url: '',
        metadata: null,
        loading: false,
        error: null,
        activeTab: 'recommended',
        selectedIndex: -1,
        focusedPanel: 'right',
        ytdlpInstalled: null,
      },
      onUpdate
    )
  }

  get filteredFormats(): VideoFormat[] {
    if (!this.state.metadata) return []
    return filterFormats(this.state.metadata.formats, this.state.activeTab)
  }

  connect(): void {
    this.syncSearchPlaceholder()
    invoke<{ installed: boolean }>('status')
      .then(({ installed }) => this.store.setState({ ytdlpInstalled: installed }))
      .catch(() => this.store.setState({ ytdlpInstalled: false }))
    this.bindActions()
  }

  disconnect(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    window.core?.shell?.registerShellActions(null)
    this.t.destroy()
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setQuery(url: string): void {
    if (this.state.url === url) return
    this.store.setState({
      url,
      metadata: null,
      error: null,
      selectedIndex: -1,
      focusedPanel: 'right',
    })
    window.core?.shell?.refreshShellActions()
  }

  /** Mouse click on a tab — switches category and focuses the format list. */
  setActiveTab(activeTab: TabId): void {
    if (this.state.activeTab === activeTab && this.state.focusedPanel === 'right') return
    this.store.setState({ activeTab, selectedIndex: -1, focusedPanel: 'right' })
    window.core?.shell?.refreshShellActions()
  }

  /** Keyboard navigation on the left tab list — stays on the left panel. */
  navigateTab(activeTab: TabId): void {
    if (this.state.activeTab === activeTab) return
    this.store.setState({ activeTab, selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedIndex
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedIndex: next })
    window.core?.shell?.refreshShellActions()
  }

  /** Mouse affordance for clicking a format row directly — selects it and focuses the right panel. */
  selectFormat(index: number): void {
    this.store.setState({ selectedIndex: index, focusedPanel: 'right' })
    window.core?.shell?.refreshShellActions()
  }

  /** Moves focus to the left (tab) panel — selection in the right panel is cleared, mirroring Settings. */
  focusLeftPanel(): void {
    this.store.setState({ focusedPanel: 'left', selectedIndex: -1 })
    window.core?.shell?.refreshShellActions()
  }

  /** Moves focus to the right (format list) panel and selects its first row. */
  focusRightPanel(): void {
    const formats = this.filteredFormats
    this.store.setState({
      focusedPanel: 'right',
      selectedIndex: formats.length > 0 ? 0 : -1,
    })
    window.core?.shell?.refreshShellActions()
  }

  async getFormats(): Promise<void> {
    const { url } = this.state
    if (!url.trim()) return
    this.store.setState({ error: null, metadata: null, loading: true })
    try {
      const metadata = await invoke<VideoMetadata>('getFormats', { url: url.trim() })
      const formats = filterFormats(metadata.formats, 'recommended')
      this.store.setState({
        metadata,
        loading: false,
        activeTab: 'recommended',
        selectedIndex: formats.length > 0 ? 0 : -1,
        focusedPanel: 'right',
      })
    } catch (e) {
      this.store.setState({ error: (e as Error).message, loading: false })
    }
    window.core?.shell?.refreshShellActions()
  }

  async startDownload(formatId: string): Promise<void> {
    const { metadata } = this.state
    if (!metadata) return
    const format = this.filteredFormats.find((f) => f.formatId === formatId)
    const resolution = format ? format.resolution : formatId
    try {
      await invoke('download', {
        url: this.state.url.trim(),
        formatId,
        resolution,
        metadata: {
          title: metadata.title,
          thumbnail: metadata.thumbnail,
          duration: metadata.duration,
          uploader: metadata.uploader,
        },
      })
      this.store.setState({ url: '', metadata: null, selectedIndex: -1, focusedPanel: 'right' })
      void window.core?.deeplink?.dispatch?.(DOWNLOAD_MANAGER_DEEPLINK)
    } catch (e) {
      this.store.setState({ error: (e as Error).message })
    }
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  private bindActions(): void {
    window.core?.shell?.registerShellActions(() => this.buildActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }

  private buildActions(): ShellAction[] {
    const t = this.t.t
    const { metadata, url, loading } = this.state

    if (!metadata) {
      return [
        {
          id: 'video-downloader-fetch',
          key: 'Enter',
          label: t('actions.fetchFormats'),
          hint: '↵',
          activeOn: () => !!url.trim() && !loading,
          handler: () => void this.getFormats(),
        },
      ]
    }

    return this.state.focusedPanel === 'left'
      ? this.buildLeftPanelActions(t)
      : this.buildRightPanelActions(t)
  }

  private buildLeftPanelActions(t: (key: string) => string): ShellAction[] {
    const currentIdx = TABS.findIndex((tab) => tab.id === this.state.activeTab)

    return [
      {
        id: 'video-downloader-tab-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          if (currentIdx > 0) this.navigateTab(TABS[currentIdx - 1].id)
        },
      },
      {
        id: 'video-downloader-tab-down',
        key: 'ArrowDown',
        label: '',
        allowRepeat: true,
        handler: () => {
          if (currentIdx < TABS.length - 1) this.navigateTab(TABS[currentIdx + 1].id)
        },
      },
      {
        id: 'video-downloader-focus-right',
        key: 'ArrowRight',
        label: '',
        handler: () => this.focusRightPanel(),
      },
      {
        id: 'video-downloader-open-tab',
        key: 'Enter',
        label: t('actions.openTab'),
        hint: '↵',
        handler: () => this.focusRightPanel(),
      },
    ]
  }

  private buildRightPanelActions(t: (key: string) => string): ShellAction[] {
    const { selectedIndex } = this.state
    const formats = this.filteredFormats

    return [
      {
        id: 'video-downloader-focus-left',
        key: 'ArrowLeft',
        label: '',
        handler: () => this.focusLeftPanel(),
      },
      {
        id: 'video-downloader-navigate-up',
        key: 'ArrowUp',
        label: t('actions.navigate'),
        hint: '↑↓',
        allowRepeat: true,
        activeOn: () => formats.length > 0,
        handler: () =>
          this.setSelectedIndex((i) => {
            if (i <= 0) {
              this.focusLeftPanel()
              return -1
            }
            return i - 1
          }),
      },
      {
        id: 'video-downloader-navigate-down',
        key: 'ArrowDown',
        label: '',
        allowRepeat: true,
        activeOn: () => formats.length > 0,
        handler: () =>
          this.setSelectedIndex((i) => (i >= formats.length - 1 ? formats.length - 1 : i + 1)),
      },
      {
        id: 'video-downloader-download',
        key: 'Enter',
        label: t('actions.download'),
        hint: '↵',
        activeOn: () => selectedIndex >= 0 && selectedIndex < formats.length,
        handler: () => {
          if (selectedIndex >= 0 && selectedIndex < formats.length) {
            void this.startDownload(formats[selectedIndex].formatId)
          }
        },
      },
    ]
  }
}
