import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'
import { getIconPaths, getIconMeta } from '../../icon-cache.ts'

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

  connectedCallback(): void {
    super.connectedCallback()
    this._onIconsUpdated = () => this.requestUpdate()
    document.addEventListener('nuxy-icons-updated', this._onIconsUpdated)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('nuxy-icons-updated', this._onIconsUpdated!)
    this._onIconsUpdated = null
  }

  private _onIconsUpdated: (() => void) | null = null

  render(): TemplateResult {
    if (!this.name) return html`${nothing}`

    const paths = getIconPaths(this.name)
    if (!paths) return html`${nothing}`

    const meta = getIconMeta(this.name)
    const size = resolveSize(this.size)
    const opacity =
      this.opacity !== '' && this.opacity !== undefined
        ? Number(this.opacity)
        : (meta?.defaultOpacity ?? DEFAULT_OPACITY)
    const color = this.color || meta?.defaultColor || 'currentColor'

    const colorStyle = color !== 'currentColor' ? `color: ${color};` : ''
    const style = `opacity: ${opacity}; ${colorStyle}`

    return html`
      <svg
        width=${size}
        height=${size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style=${style}
        .innerHTML=${paths}
      ></svg>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-icon': NuxyIconElement
  }
}
