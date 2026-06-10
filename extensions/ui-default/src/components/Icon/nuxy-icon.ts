import { ICON_PATHS } from './icon-paths'
import { LitElement, html, css, nothing, customElement, property } from '@nuxy/core'
import type { TemplateResult } from '@nuxy/core'

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

  render(): TemplateResult {
    if (!this.name) return html`${nothing}`

    const def = ICON_PATHS[this.name]
    if (!def) return html`${nothing}`

    const size = resolveSize(this.size)
    const opacity =
      this.opacity !== '' ? Number(this.opacity) : (def.defaultOpacity ?? DEFAULT_OPACITY)
    const color = this.color || def.defaultColor || 'currentColor'

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
      >
        ${def.paths}
      </svg>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-icon': NuxyIconElement
  }
}
