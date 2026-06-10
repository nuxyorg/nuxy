import { LitElement, html, css, customElement } from '@nuxy/core'

const DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type Direction = (typeof DIRECTIONS)[number]

const HANDLE_STYLES: Record<Direction, string> = {
  n: 'top:0;left:0;right:0;height:6px;cursor:ns-resize',
  s: 'bottom:0;left:0;right:0;height:6px;cursor:ns-resize',
  e: 'top:0;bottom:0;right:0;width:6px;cursor:ew-resize',
  w: 'top:0;bottom:0;left:0;width:6px;cursor:ew-resize',
  ne: 'top:0;right:0;width:10px;height:10px;cursor:nesw-resize',
  nw: 'top:0;left:0;width:10px;height:10px;cursor:nwse-resize',
  se: 'bottom:0;right:0;width:10px;height:10px;cursor:nwse-resize',
  sw: 'bottom:0;left:0;width:10px;height:10px;cursor:nwse-resize',
}

@customElement('nuxy-shell-resize-handles')
export class NuxyShellResizeHandlesElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }
  `

  connectedCallback(): void {
    super.connectedCallback()
    if (this.childElementCount > 0) return

    for (const dir of DIRECTIONS) {
      const handle = document.createElement('div')
      handle.dataset.direction = dir
      handle.style.cssText = `position:absolute;z-index:9999;${HANDLE_STYLES[dir]}`
      handle.addEventListener('mousedown', (e) => {
        this.dispatchEvent(
          new CustomEvent('nuxy-shell-resize-start', {
            detail: { direction: dir, nativeEvent: e },
            bubbles: true,
            composed: true,
          })
        )
      })
      this.appendChild(handle)
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
  }

  render() {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-resize-handles': NuxyShellResizeHandlesElement
  }
}

export type { Direction as ShellResizeDirection }
