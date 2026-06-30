import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  property,
  type TemplateResult,
} from '@nuxyorg/core'

function fmtDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  const secs = Math.floor(sec % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDurationAttr(raw: string | null): string {
  if (!raw) return ''
  const n = Number(raw)
  if (Number.isFinite(n) && raw.trim() !== '' && !raw.includes(':')) return fmtDuration(n)
  return raw
}

function parseProgress(raw: string | null): number | null {
  if (raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

@customElement('nuxy-media-preview')
export class NuxyMediaPreviewElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      gap: var(--space-4);
      align-items: center;
      min-width: 0;
      width: 100%;
    }

    :host([layout='horizontal']) {
      flex-direction: row;
    }

    :host([layout='vertical']) {
      flex-direction: column;
      align-items: flex-start;
    }

    .nuxy-media-preview__thumbnail-container {
      position: relative;
      border-radius: var(--radius-sm);
      overflow: hidden;
      flex-shrink: 0;
    }

    /* Sizing styles */
    :host([size='sm']) .nuxy-media-preview__thumbnail-container {
      width: 80px;
      height: 45px;
    }

    :host([size='md']) .nuxy-media-preview__thumbnail-container {
      width: 120px;
      height: 68px;
    }

    :host([size='lg']) .nuxy-media-preview__thumbnail-container {
      width: 160px;
      height: 90px;
    }

    .nuxy-media-preview__thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .nuxy-media-preview__duration {
      position: absolute;
      bottom: var(--space-1);
      right: var(--space-1);
      background: var(--surface-overlay, rgba(0, 0, 0, 0.8));
      color: var(--text-on-accent);
      padding: 0 var(--space-1);
      border-radius: var(--radius-xs);
      font-family: var(--font-mono);
      font-size: 9px;
      line-height: 1.2;
    }

    .nuxy-media-preview__content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      flex: 1;
      gap: var(--space-1);
    }

    .nuxy-media-preview__title {
      color: var(--text-normal);
      font-weight: var(--font-semibold, bold);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host([size='sm']) .nuxy-media-preview__title {
      font-size: var(--font-sm);
    }

    :host([size='md']) .nuxy-media-preview__title {
      font-size: var(--font-md);
    }

    :host([size='lg']) .nuxy-media-preview__title {
      font-size: var(--font-lg);
    }

    .nuxy-media-preview__meta-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .nuxy-media-preview__uploader {
      color: var(--text-muted);
      font-size: var(--font-xs);
    }

    .nuxy-media-preview__progress {
      width: 100%;
      margin-top: var(--space-1);
    }

    .nuxy-media-preview__footer-text {
      color: var(--text-muted);
      font-size: var(--font-xs);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Inline progress track styles (from ProgressBar) */
    .nuxy-progress__track {
      width: 100%;
      background: rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-xl);
      overflow: hidden;
    }

    .nuxy-progress__track--sm {
      height: 3px;
    }

    .nuxy-progress__fill {
      height: 100%;
      border-radius: var(--radius-xl);
      background: var(--syntax-operator);
      transition: width 0.3s ease;
    }
  `

  @property({ type: String })
  declare thumbnail: string
  @property({ type: String })
  declare title: string
  @property({ type: String })
  declare uploader: string
  @property({ type: String })
  declare duration: string
  @property({ type: String })
  declare progress: string
  @property({ type: String, attribute: 'footer-text' })
  declare footerText: string
  @property({ type: String, reflect: true })
  declare size: string
  @property({ type: String, reflect: true })
  declare layout: string

  static get observedAttributes(): string[] {
    // Reading `super.observedAttributes` triggers Lit's `finalize()` step,
    // which turns `static styles` into adopted stylesheets. Skipping it
    // silently drops all styling for this element (no error, no warning).
    return [
      ...super.observedAttributes,
      'thumbnail',
      'title',
      'uploader',
      'duration',
      'progress',
      'footer-text',
      'size',
      'layout',
    ]
  }

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.size) this.size = 'md'
    if (!this.layout) this.layout = 'horizontal'
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
  }

  private renderThumbnail(thumbnail: string, duration: string): TemplateResult {
    return html`
      <div class="nuxy-media-preview__thumbnail-container">
        <img
          src=${thumbnail}
          class="nuxy-media-preview__thumbnail"
          alt=""
          referrerpolicy="no-referrer"
          loading="lazy"
        />
        ${duration ? html`<span class="nuxy-media-preview__duration">${duration}</span>` : nothing}
      </div>
    `
  }

  private renderProgress(progress: number): TemplateResult {
    const pct = Math.min(100, Math.max(0, progress))
    return html`
      <div class="nuxy-media-preview__progress">
        <div role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
          <div class="nuxy-progress__track nuxy-progress__track--sm">
            <div class="nuxy-progress__fill" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>
    `
  }

  render(): TemplateResult {
    const thumbnail = (this.thumbnail || this.getAttribute('thumbnail') || '').trim()
    const title = this.title || this.getAttribute('title') || ''
    const uploader = this.uploader || this.getAttribute('uploader') || ''
    const duration = formatDurationAttr(this.duration || this.getAttribute('duration'))
    const progress = parseProgress(this.progress || this.getAttribute('progress'))
    const footerText = this.footerText || this.getAttribute('footer-text') || ''

    // Collect slotted content — badge and extras pass through via slots
    const badge =
      Array.from(this.children).find(
        (el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-badge')
      ) ?? null
    const extras: Node[] = []
    for (const child of [...this.childNodes]) {
      if (child === badge) continue
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        if (
          el.className === 'nuxy-media-preview__thumbnail-container' ||
          el.className === 'nuxy-media-preview__content'
        )
          continue
        extras.push(child)
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        extras.push(child)
      }
    }

    return html`
      ${thumbnail ? this.renderThumbnail(thumbnail, duration) : nothing}
      <div class="nuxy-media-preview__content">
        <span class="nuxy-media-preview__title">${title}</span>
        ${uploader || badge
          ? html`
              <div class="nuxy-media-preview__meta-row">
                ${uploader
                  ? html`<span class="nuxy-media-preview__uploader">${uploader}</span>`
                  : nothing}
                ${badge ? html`<span class="nuxy-media-preview__badge">${badge}</span>` : nothing}
              </div>
            `
          : nothing}
        ${progress !== null ? this.renderProgress(progress) : nothing}
        ${footerText
          ? html`<span class="nuxy-media-preview__footer-text">${footerText}</span>`
          : nothing}
        ${extras.map((node) => html`${node}`)}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-media-preview': NuxyMediaPreviewElement
  }
}
