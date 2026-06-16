import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  state,
  unsafeSVG,
} from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'
import { getIconSvg, getIconMeta, iconCacheReady } from '../../icon-cache.ts'

const DEFAULT_SIZE = 18
const DEFAULT_OPACITY = 0.65

function resolveSize(raw: string): number | string {
  if (!raw) return DEFAULT_SIZE
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : raw
}

@customElement('nuxy-icon')
export class NuxyIconElement extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `

  @property({ type: String })
  declare name: string
  @property({ type: String })
  declare size: string
  @property({ type: String })
  declare opacity: string
  @property({ type: String })
  declare color: string
  @property({ type: String, attribute: 'stroke-width' })
  declare strokeWidth: string

  @state()
  declare private _svg: string | null

  private _pendingName: string | null = null
  private _onIconsUpdated: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
    this._onIconsUpdated = () => {
      this._svg = null
      void this._fetchSvg()
    }
    document.addEventListener('nuxy-icons-updated', this._onIconsUpdated)
    void this._fetchSvg()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('nuxy-icons-updated', this._onIconsUpdated!)
    this._onIconsUpdated = null
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('name')) {
      this._svg = null
      void this._fetchSvg()
    }
  }

  private async _fetchSvg(): Promise<void> {
    const name = this.name
    if (!name) return
    this._pendingName = name
    await iconCacheReady()
    if (this._pendingName !== name) return
    const svg = await getIconSvg(name)
    if (this._pendingName === name) {
      this._svg = svg
    }
  }

  render(): TemplateResult {
    if (!this.name || !this._svg) return html`${nothing}`

    const meta = getIconMeta(this.name)
    const size = resolveSize(this.size)
    const sizeVal = typeof size === 'number' ? `${size}px` : size
    const opacity =
      this.opacity !== '' && this.opacity !== undefined
        ? Number(this.opacity)
        : (meta?.defaultOpacity ?? DEFAULT_OPACITY)
    const color = this.color || meta?.defaultColor || 'currentColor'

    const style = [
      `width: ${sizeVal}`,
      `height: ${sizeVal}`,
      `opacity: ${opacity}`,
      color !== 'currentColor' ? `color: ${color}` : '',
    ]
      .filter(Boolean)
      .join('; ')

    const strokeStyle: TemplateResult | typeof nothing = this.strokeWidth
      ? html`<style>
          svg {
            stroke-width: ${this.strokeWidth};
          }
        </style>`
      : nothing

    return html`${strokeStyle}<span style=${style}>${unsafeSVG(this._svg)}</span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-icon': NuxyIconElement
  }
}
