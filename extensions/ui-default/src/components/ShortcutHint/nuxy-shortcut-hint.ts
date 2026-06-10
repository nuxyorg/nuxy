import { LitElement, html, css, customElement } from '@nuxy/core'

@customElement('nuxy-shortcut-hint')
export class NuxyShortcutHintElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-xs);
      color: var(--syntax-keyword);
    }

    ::slotted(.nuxy-shortcut-action) {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      cursor: pointer;
      border-radius: var(--radius-sm);
      padding: 1px var(--space-1);
      margin: 0 -var(--space-1);
      transition:
        opacity 0.1s,
        background 0.1s;
    }

    ::slotted(.nuxy-shortcut-action):hover {
      opacity: 0.75;
      background: var(--hover, rgba(255, 255, 255, 0.06));
    }
  `

  render() {
    return html`<slot></slot>`
  }
}

@customElement('nuxy-shortcut-sep')
export class NuxyShortcutSepElement extends LitElement {
  static styles = css`
    :host {
      opacity: 0.4;
    }
  `

  connectedCallback(): void {
    if (!this.textContent?.trim()) this.textContent = '/'
    super.connectedCallback()
  }

  render() {
    return html`<slot></slot>`
  }
}
