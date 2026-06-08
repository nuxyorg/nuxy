import './index.css'

export class NuxyShortcutHintElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('nuxy-shortcut-hint')
  }
}

export class NuxyShortcutSepElement extends HTMLElement {
  connectedCallback(): void {
    this.classList.add('nuxy-shortcut-sep')
    if (!this.textContent) this.textContent = '/'
  }
}

if (!customElements.get('nuxy-shortcut-hint')) {
  customElements.define('nuxy-shortcut-hint', NuxyShortcutHintElement)
}
if (!customElements.get('nuxy-shortcut-sep')) {
  customElements.define('nuxy-shortcut-sep', NuxyShortcutSepElement)
}
