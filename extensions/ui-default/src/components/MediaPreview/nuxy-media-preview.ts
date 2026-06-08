import '../ProgressBar/index.css'
import './index.css'
import { syncHostClasses } from '../../h.ts'

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

const STRUCTURAL_CLASSES = new Set([
  'nuxy-media-preview__thumbnail-container',
  'nuxy-media-preview__content',
])

export class NuxyMediaPreviewElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['thumbnail', 'title', 'uploader', 'duration', 'progress', 'footer-text', 'size', 'layout']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private collectSlots(): { badge: Element | null; extras: Node[] } {
    const badge = this.querySelector('[data-badge]')
    const extras: Node[] = []

    for (const child of [...this.childNodes]) {
      if (child === badge) continue
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        if (STRUCTURAL_CLASSES.has(el.className)) continue
        extras.push(child)
      } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        extras.push(child)
      }
    }

    return { badge, extras }
  }

  private render(): void {
    const thumbnail = this.getAttribute('thumbnail')
    const title = this.getAttribute('title') ?? ''
    const uploader = this.getAttribute('uploader')
    const duration = formatDurationAttr(this.getAttribute('duration'))
    const progress = parseProgress(this.getAttribute('progress'))
    const footerText = this.getAttribute('footer-text')
    const size = this.getAttribute('size') ?? 'md'
    const layout = this.getAttribute('layout') ?? 'horizontal'
    const extraClass = this.getAttribute('class') ?? ''

    const { badge, extras } = this.collectSlots()

    syncHostClasses(this, 'nuxy-media-preview', `nuxy-media-preview--${size}`, `nuxy-media-preview--${layout}`)

    this.replaceChildren()

    if (thumbnail) {
      const thumbContainer = document.createElement('div')
      thumbContainer.className = 'nuxy-media-preview__thumbnail-container'

      const img = document.createElement('img')
      img.src = thumbnail
      img.className = 'nuxy-media-preview__thumbnail'
      img.alt = ''
      thumbContainer.appendChild(img)

      if (duration) {
        const durationEl = document.createElement('span')
        durationEl.className = 'nuxy-media-preview__duration'
        durationEl.textContent = duration
        thumbContainer.appendChild(durationEl)
      }

      this.appendChild(thumbContainer)
    }

    const content = document.createElement('div')
    content.className = 'nuxy-media-preview__content'

    const titleEl = document.createElement('span')
    titleEl.className = 'nuxy-media-preview__title'
    titleEl.textContent = title
    content.appendChild(titleEl)

    if (uploader || badge) {
      const metaRow = document.createElement('div')
      metaRow.className = 'nuxy-media-preview__meta-row'

      if (uploader) {
        const uploaderEl = document.createElement('span')
        uploaderEl.className = 'nuxy-media-preview__uploader'
        uploaderEl.textContent = uploader
        metaRow.appendChild(uploaderEl)
      }

      if (badge) {
        const badgeWrap = document.createElement('span')
        badgeWrap.className = 'nuxy-media-preview__badge'
        badgeWrap.appendChild(badge)
        metaRow.appendChild(badgeWrap)
      }

      content.appendChild(metaRow)
    }

    if (progress !== null) {
      const progressWrap = document.createElement('div')
      progressWrap.className = 'nuxy-media-preview__progress'

      const pct = Math.min(100, Math.max(0, progress))
      const bar = document.createElement('div')
      bar.className = 'nuxy-progress'
      bar.setAttribute('role', 'progressbar')
      bar.setAttribute('aria-valuenow', String(pct))
      bar.setAttribute('aria-valuemin', '0')
      bar.setAttribute('aria-valuemax', '100')

      const track = document.createElement('div')
      track.className = 'nuxy-progress__track nuxy-progress__track--sm'

      const fill = document.createElement('div')
      fill.className = 'nuxy-progress__fill'
      fill.style.width = `${pct}%`

      track.appendChild(fill)
      bar.appendChild(track)
      progressWrap.appendChild(bar)
      content.appendChild(progressWrap)
    }

    if (footerText) {
      const footerEl = document.createElement('span')
      footerEl.className = 'nuxy-media-preview__footer-text'
      footerEl.textContent = footerText
      content.appendChild(footerEl)
    }

    for (const node of extras) {
      content.appendChild(node)
    }

    this.appendChild(content)
  }
}

if (!customElements.get('nuxy-media-preview')) {
  customElements.define('nuxy-media-preview', NuxyMediaPreviewElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-media-preview': NuxyMediaPreviewElement
  }
}
