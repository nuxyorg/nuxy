import {
  LitElement,
  html,
  css,
  nothing,
  customElement,
  state,
  query as queryDecorator,
  type TemplateResult,
} from '@nuxyorg/core'

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

@customElement('nuxy-file-input')
export class NuxyFileInputElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .nuxy-file-input__zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-5);
      border: 1.5px dashed var(--syntax-comment);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
      text-align: center;
      position: relative;
    }

    .nuxy-file-input__zone:hover,
    .nuxy-file-input__zone--dragover {
      border-color: var(--syntax-operator);
      background: rgba(42, 192, 255, 0.04);
    }

    .nuxy-file-input__zone--has-files {
      border-style: solid;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .nuxy-file-input__native {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .nuxy-file-input__icon {
      color: var(--syntax-comment);
    }

    .nuxy-file-input__label {
      font-size: var(--font-md);
      color: var(--syntax-variable);
    }

    .nuxy-file-input__hint {
      font-size: var(--font-sm);
      color: var(--syntax-comment);
    }

    .nuxy-file-input__files {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .nuxy-file-input__file {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--radius-md);
      font-size: var(--font-sm);
      color: var(--syntax-variable);
    }

    .nuxy-file-input__file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nuxy-file-input__file-size {
      color: var(--syntax-comment);
      flex-shrink: 0;
    }

    .nuxy-file-input__remove {
      background: transparent;
      border: none;
      color: var(--syntax-comment);
      cursor: pointer;
      padding: 0;
      display: flex;
      transition: color 0.15s ease;
      flex-shrink: 0;
    }

    .nuxy-file-input__remove:hover {
      color: var(--syntax-invalid);
    }
  `

  @state()
  declare private dragOver: boolean
  @state()
  declare private internalFiles: File[]

  @queryDecorator('.nuxy-file-input__native')
  private nativeFileInput!: HTMLInputElement

  static get observedAttributes(): string[] {
    return [
      ...super.observedAttributes,
      'files-meta',
      'multiple',
      'accept',
      'disabled',
      'label',
      'hint',
      'id',
    ]
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    super.attributeChangedCallback(name, oldVal, newVal)
    if (this.isConnected) {
      this.requestUpdate()
    }
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
    }
  }

  private onDragLeave = (): void => {
    this.dragOver = false
  }

  private onDrop = (e: DragEvent): void => {
    e.preventDefault()
    this.dragOver = false
    if (!this.isDisabled()) this.handleFiles(e.dataTransfer?.files ?? null)
  }

  private onZoneClick = (): void => {
    if (!this.isDisabled()) {
      this.nativeFileInput?.click()
    }
  }

  private onZoneKeyDown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !this.isDisabled()) {
      e.preventDefault()
      this.nativeFileInput?.click()
    }
  }

  private onNativeChange = (e: Event): void => {
    const input = e.target as HTMLInputElement
    this.handleFiles(input?.files ?? null)
    if (input) input.value = ''
  }

  private onFilesClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest('.nuxy-file-input__remove')
    if (!target || this.isDisabled()) return
    e.stopPropagation()
    const idx = Number((target as HTMLElement).dataset.index)
    if (Number.isNaN(idx)) return

    if (!this.hasAttribute('files-meta')) {
      this.internalFiles = this.internalFiles.filter((_, i) => i !== idx)
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
    this.dispatchEvent(
      new CustomEvent('nuxy-file-input-change', {
        detail: { files: next },
        bubbles: true,
        composed: true,
      })
    )
  }

  private renderFileRow(file: FileMeta, idx: number): TemplateResult {
    const disabled = this.isDisabled()
    return html`
      <div class="nuxy-file-input__file">
        <span class="nuxy-file-input__file-name">${file.name}</span>
        <span class="nuxy-file-input__file-size">${formatSize(file.size)}</span>
        ${!disabled
          ? html`
              <button
                type="button"
                class="nuxy-file-input__remove"
                data-index=${String(idx)}
                aria-label=${`Remove ${file.name}`}
              >
                <nuxy-icon name="Close" size="14" opacity="1"></nuxy-icon>
              </button>
            `
          : nothing}
      </div>
    `
  }

  render(): TemplateResult {
    const label = this.getAttribute('label') ?? 'Choose files or drag them here'
    const hint = this.getAttribute('hint')
    const accept = this.getAttribute('accept')
    const id = this.getAttribute('id')
    const disabled = this.isDisabled()
    const files = this.displayFiles()

    const zoneClass = [
      'nuxy-file-input__zone',
      this.dragOver ? 'nuxy-file-input__zone--dragover' : '',
      files.length > 0 ? 'nuxy-file-input__zone--has-files' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return html`
      <div
        class=${zoneClass}
        role="button"
        tabindex=${disabled ? '-1' : '0'}
        aria-label=${label}
        @dragover=${this.onDragOver}
        @dragleave=${this.onDragLeave}
        @drop=${this.onDrop}
        @click=${this.onZoneClick}
        @keydown=${this.onZoneKeyDown}
      >
        <input
          type="file"
          class="nuxy-file-input__native"
          aria-label=${label}
          ?disabled=${disabled}
          ?multiple=${this.isMultiple()}
          accept=${accept ?? nothing}
          id=${id ?? nothing}
          @change=${this.onNativeChange}
        />
        <span class="nuxy-file-input__icon"><nuxy-icon name="Upload" size="24"></nuxy-icon></span>
        <span class="nuxy-file-input__label">${label}</span>
        ${hint
          ? html`<span class="nuxy-file-input__hint">${hint}</span>`
          : html`<span class="nuxy-file-input__hint" hidden></span>`}
      </div>
      ${files.length > 0
        ? html`
            <div class="nuxy-file-input__files" @click=${this.onFilesClick}>
              ${files.map((f, i) => this.renderFileRow(f, i))}
            </div>
          `
        : html`<div class="nuxy-file-input__files"></div>`}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-file-input': NuxyFileInputElement
  }
}
