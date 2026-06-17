const GRADIENT_EXT_ID = 'com.nuxy.gradient'

type MountHandle = { setState: (state: Record<string, unknown>) => void; release: () => void }

/**
 * Viewmodel for the gradient helper extension.
 *
 * Owns the composition-layer lifecycle (mount / unmount) and the legacy
 * `nuxy-gradient-toggle` event bridge.  Instantiated directly from
 * `frontend.ts` — no custom element required.
 *
 * @example
 * ```ts
 * // frontend.ts
 * import { GradientViewModel } from './gradient-viewmodel.ts'
 * new GradientViewModel().mount()
 * ```
 */
export class GradientViewModel {
  private handle: MountHandle | null = null
  private readonly onLegacyToggle: (e: Event) => void

  constructor() {
    this.onLegacyToggle = (e: Event) => {
      void this.mountLayer().then(() => {
        this.applyState((e as CustomEvent).detail)
      })
    }
  }

  /** Bootstrap: bind events and attempt initial mount. */
  mount(): void {
    window.addEventListener('nuxy-gradient-toggle', this.onLegacyToggle)
    window.core?.events?.on('composition-ready', () => this.tryMount())
    this.tryMount()
  }

  /** Cleanup: release composition layer and remove listeners. */
  release(): void {
    window.removeEventListener('nuxy-gradient-toggle', this.onLegacyToggle)
    this.handle?.release()
    this.handle = null
  }

  // ── State helpers ────────────────────────────────────────────────────────

  /** Push a new gradient state to the composition layer. */
  applyState(detail: unknown): void {
    if (!this.handle) return
    if (detail === false || detail === null || detail === undefined) {
      this.handle.setState({ active: false, mode: 'light' })
      return
    }
    if (detail === true) {
      this.handle.setState({ active: true, mode: 'light' })
      return
    }
    if (typeof detail === 'object' && detail !== null) {
      const d = detail as { active?: boolean; mode?: string }
      this.handle.setState({
        active: d.active !== false,
        mode: typeof d.mode === 'string' ? d.mode : 'light',
      })
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private tryMount(): void {
    if (document.getElementsByTagName('nuxy-shell').length > 0) void this.mountLayer()
  }

  private async mountLayer(): Promise<void> {
    if (this.handle) return
    if (!window.core?.composition?.mount) return

    const Ctor = customElements.get('nuxy-gradient-layer') as CustomElementConstructor | undefined
    if (!Ctor) return
    const layer = new Ctor()
    try {
      this.handle = await window.core.composition.mount('background-layer', layer, {
        extId: GRADIENT_EXT_ID,
        state: { active: false, mode: 'light' },
      })
    } catch (err) {
      console.warn('[gradient] composition mount failed:', err)
    }
  }
}
