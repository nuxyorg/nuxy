import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-aspect-ratio')
export class NuxyAspectRatioElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
    }

    div {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
    }
  `

  @property({ type: Number })
  declare ratio: number

  @property({ type: String })
  declare class: string

  private _initialHTML = ''

  connectedCallback(): void {
    // Capture initial children before Lit replaces them
    this._initialHTML = this.innerHTML
    super.connectedCallback()
    this.applyHostStyles()
  }

  updated(): void {
    this.applyHostStyles()
  }

  private applyHostStyles(): void {
    const ratio = Number(this.ratio) || 1
    this.style.paddingBottom = `${100 / ratio}%`
  }

  render(): TemplateResult {
    return html` <div .innerHTML=${this._initialHTML}></div> `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-aspect-ratio': NuxyAspectRatioElement
  }
}
