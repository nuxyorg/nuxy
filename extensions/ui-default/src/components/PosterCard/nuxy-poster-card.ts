import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'
import '../Icon/nuxy-icon.ts'

/**
 * A portrait (2:3) poster cell for media grids: cover image, single-line title and
 * subtitle, plus an optional favorite star. Fixed aspect ratio keeps grid cells uniform.
 */
@customElement('nuxy-poster-card')
export class NuxyPosterCardElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      width: 100%;
      min-width: 0;
      cursor: pointer;
    }

    .poster {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 3;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-overlay, rgba(255, 255, 255, 0.04));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .placeholder {
      padding: var(--space-2);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-xs);
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    .star {
      position: absolute;
      top: var(--space-1);
      right: var(--space-1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: var(--radius-sm);
      background: var(--surface-overlay, rgba(0, 0, 0, 0.6));
      color: var(--color-warning, var(--syntax-orange));
    }

    .title {
      font-size: var(--font-sm);
      color: var(--text-normal);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .subtitle {
      font-size: var(--font-xs);
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `

  @property({ type: String })
  declare poster: string
  @property({ type: String })
  declare title: string
  @property({ type: String })
  declare subtitle: string
  @property({ type: Boolean, reflect: true })
  declare favorite: boolean
  @property({ type: Boolean, reflect: true })
  declare active: boolean

  render(): TemplateResult {
    const title = this.title ?? ''
    return html`
      <div class="poster">
        ${this.poster
          ? html`<img src=${this.poster} alt="" loading="lazy" />`
          : html`<span class="placeholder">${title}</span>`}
        ${this.favorite
          ? html`<span class="star"><nuxy-icon name="star" size="14"></nuxy-icon></span>`
          : nothing}
      </div>
      <span class="title">${title}</span>
      ${this.subtitle ? html`<span class="subtitle">${this.subtitle}</span>` : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-poster-card': NuxyPosterCardElement
  }
}
