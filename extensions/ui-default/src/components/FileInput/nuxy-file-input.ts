import './index.css'
import { syncHostClasses } from '../../h.ts'

const UPLOAD_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
const REMOVE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

export interface FileMeta {
  name: string
  size: number
  lastModified: number
}

function parseFilesMeta(raw: string | null): FileMeta[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as FileMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export class NuxyFileInputElement extends HTMLElement {
  private zone: HTMLDivElement | null = null
  private nativeInput: HTMLInputElement | null = null
  private filesEl: HTMLDivElement | null = null
  private internalFiles: File[] = []
  private dragOver = false

  static get observedAttributes(): string[] {
    return ['files-meta', 'multiple', 'accept', 'disabled', 'label', 'hint', 'id']
  }

  connectedCallback(): void {
    this.build()
    this.sync()
    this.zone?.addEventListener('dragover', this.onDragOver)
    this.zone?.addEventListener('dragleave', this.onDragLeave)
    this.zone?.addEventListener('drop', this.onDrop)
    this.zone?.addEventListener('click', this.onZoneClick)
    this.zone?.addEventListener('keydown', this.onZoneKeyDown)
    this.nativeInput?.addEventListener('change', this.onNativeChange)
    this.filesEl?.addEventListener('click', this.onFilesClick)
  }

  disconnectedCallback(): void {
    this.zone?.removeEventListener('dragover', this.onDragOver)
    this.zone?.removeEventListener('dragleave', this.onDragLeave)
    this.zone?.removeEventListener('drop', this.onDrop)
    this.zone?.removeEventListener('click', this.onZoneClick)
    this.zone?.removeEventListener('keydown', this.onZoneKeyDown)
    this.nativeInput?.removeEventListener('change', this.onNativeChange)
    this.filesEl?.removeEventListener('click', this.onFilesClick)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'files-meta') this.renderFiles()
    else this.sync()
  }

  private isDisabled(): boolean {
    return this.hasAttribute('disabled')
  }

  private isMultiple(): boolean {
    return this.hasAttribute('multiple')
  }

  private displayFiles(): FileMeta[] {
    if (this.hasAttribute('files-meta')) {
      return parseFilesMeta(this.getAttribute('files-meta'))
    }
    return this.internalFiles.map((f) => ({
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
    }))
  }

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault()
    if (!this.isDisabled()) {
      this.dragOver = true
      this.syncZoneClasses()
    }
  }

  private onDragLeave = (): void => {
    this.dragOver = false
    this.syncZoneClasses()
  }

  private onDrop = (e: DragEvent): void => {
    e.preventDefault()
    this.dragOver = false
    this.syncZoneClasses()
    if (!this.isDisabled()) this.handleFiles(e.dataTransfer?.files ?? null)
  }

  private onZoneClick = (): void => {
    if (!this.isDisabled()) this.nativeInput?.click()
  }

  private onZoneKeyDown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.isDisabled()) {
      e.preventDefault()
      this.nativeInput?.click()
    }
  }

  private onNativeChange = (): void => {
    this.handleFiles(this.nativeInput?.files ?? null)
    if (this.nativeInput) this.nativeInput.value = ''
  }

  private onFilesClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest('.nuxy-file-input__remove')
    if (!target || this.isDisabled()) return
    e.stopPropagation()
    const idx = Number((target as HTMLElement).dataset.index)
    if (Number.isNaN(idx)) return

    if (!this.hasAttribute('files-meta')) {
      this.internalFiles = this.internalFiles.filter((_, i) => i !== idx)
      this.renderFiles()
    }

    this.dispatchEvent(
      new CustomEvent('nuxy-file-input-remove', {
        detail: { index: idx },
        bubbles: true,
        composed: true,
      })
    )
  }

  private handleFiles(fileList: FileList | null): void {
    if (!fileList || this.isDisabled()) return
    const picked = Array.from(fileList)
    const next = this.isMultiple() ? [...this.internalFiles, ...picked] : picked
    this.internalFiles = next
    this.renderFiles()
    this.dispatchEvent(
      new CustomEvent('nuxy-file-input-change', {
        detail: { files: next },
        bubbles: true,
        composed: true,
      })
    )
  }

  private build(): void {
    if (this.zone) return

    this.zone = document.createElement('div')
    this.zone.className = 'nuxy-file-input__zone'
    this.zone.setAttribute('role', 'button')
    this.zone.tabIndex = 0

    this.nativeInput = document.createElement('input')
    this.nativeInput.type = 'file'
    this.nativeInput.className = 'nuxy-file-input__native'

    const icon = document.createElement('span')
    icon.className = 'nuxy-file-input__icon'
    icon.innerHTML = UPLOAD_SVG

    const label = document.createElement('span')
    label.className = 'nuxy-file-input__label'

    const hint = document.createElement('span')
    hint.className = 'nuxy-file-input__hint'

    this.zone.append(this.nativeInput, icon, label, hint)

    this.filesEl = document.createElement('div')
    this.filesEl.className = 'nuxy-file-input__files'

    this.append(this.zone, this.filesEl)
  }

  private sync(): void {
    const extraClass = this.getAttribute('class') ?? ''
    const label = this.getAttribute('label') ?? 'Choose files or drag them here'
    const hint = this.getAttribute('hint')
    const accept = this.getAttribute('accept')
    const id = this.getAttribute('id')
    const disabled = this.isDisabled()

    syncHostClasses(this, 'nuxy-file-input')

    if (this.zone) {
      this.zone.setAttribute('aria-label', label)
      this.zone.tabIndex = disabled ? -1 : 0
    }
    if (this.nativeInput) {
      this.nativeInput.disabled = disabled
      this.nativeInput.multiple = this.isMultiple()
      this.nativeInput.setAttribute('aria-label', label)
      if (accept) this.nativeInput.accept = accept
      else this.nativeInput.removeAttribute('accept')
      if (id) this.nativeInput.id = id
      else this.nativeInput.removeAttribute('id')
    }

    const labelEl = this.zone?.querySelector('.nuxy-file-input__label')
    if (labelEl) labelEl.textContent = label

    const hintEl = this.zone?.querySelector('.nuxy-file-input__hint') as HTMLElement | null
    if (hintEl) {
      if (hint) {
        hintEl.textContent = hint
        hintEl.hidden = false
      } else {
        hintEl.textContent = ''
        hintEl.hidden = true
      }
    }

    this.syncZoneClasses()
    this.renderFiles()
  }

  private syncZoneClasses(): void {
    if (!this.zone) return
    const files = this.displayFiles()
    this.zone.className = [
      'nuxy-file-input__zone',
      this.dragOver ? 'nuxy-file-input__zone--dragover' : '',
      files.length > 0 ? 'nuxy-file-input__zone--has-files' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  private renderFiles(): void {
    if (!this.filesEl) return

    const files = this.displayFiles()
    this.syncZoneClasses()
    this.filesEl.replaceChildren()

    if (files.length === 0) return

    const disabled = this.isDisabled()

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx]
      const row = document.createElement('div')
      row.className = 'nuxy-file-input__file'

      const name = document.createElement('span')
      name.className = 'nuxy-file-input__file-name'
      name.textContent = file.name

      const size = document.createElement('span')
      size.className = 'nuxy-file-input__file-size'
      size.textContent = formatSize(file.size)

      row.append(name, size)

      if (!disabled) {
        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.className = 'nuxy-file-input__remove'
        removeBtn.dataset.index = String(idx)
        removeBtn.setAttribute('aria-label', `Remove ${file.name}`)
        removeBtn.innerHTML = REMOVE_SVG
        row.appendChild(removeBtn)
      }

      this.filesEl.appendChild(row)
    }
  }
}

if (!customElements.get('nuxy-file-input')) {
  customElements.define('nuxy-file-input', NuxyFileInputElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-file-input': NuxyFileInputElement
  }
}
