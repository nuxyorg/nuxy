/* cspell:ignore nesw */
import { LitElement, html, css, customElement } from '@nuxyorg/core'

const DIRECTIONS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
type Direction = (typeof DIRECTIONS)[number]

@customElement('nuxy-shell-resize-handles')
export class NuxyShellResizeHandlesElement extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .handle {
      position: absolute;
      z-index: 9999;
    }

    .handle[data-direction='n'] {
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
    }
    .handle[data-direction='s'] {
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
    }
    .handle[data-direction='e'] {
      top: 0;
      bottom: 0;
      right: 0;
      width: 6px;
      cursor: ew-resize;
    }
    .handle[data-direction='w'] {
      top: 0;
      bottom: 0;
      left: 0;
      width: 6px;
      cursor: ew-resize;
    }
    .handle[data-direction='ne'] {
      top: 0;
      right: 0;
      width: 10px;
      height: 10px;
      cursor: nesw-resize;
    }
    .handle[data-direction='nw'] {
      top: 0;
      left: 0;
      width: 10px;
      height: 10px;
      cursor: nwse-resize;
    }
    .handle[data-direction='se'] {
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      cursor: nwse-resize;
    }
    .handle[data-direction='sw'] {
      bottom: 0;
      left: 0;
      width: 10px;
      height: 10px;
      cursor: nwse-resize;
    }
  `

  private _onMouseDown(dir: Direction, e: MouseEvent): void {
    this.dispatchEvent(
      new CustomEvent('nuxy-shell-resize-start', {
        detail: { direction: dir, nativeEvent: e },
        bubbles: true,
        composed: true,
      })
    )
  }

  render() {
    return html`
      ${DIRECTIONS.map(
        (dir) => html`
          <div
            class="handle"
            data-direction=${dir}
            @mousedown=${(e: MouseEvent) => this._onMouseDown(dir, e)}
          ></div>
        `
      )}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-shell-resize-handles': NuxyShellResizeHandlesElement
  }
}

export type { Direction as ShellResizeDirection }
