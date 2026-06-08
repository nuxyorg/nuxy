import './index.css'
import { syncHostClasses } from '../../h.ts'

const REMOVE_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

export class NuxyTagElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['variant', 'removable']
  }

  connectedCallback(): void {
    this.classList.add('nuxy-tag')
    this.render()
  }

  disconnectedCallback(): void {
    this.querySelector('.nuxy-tag__remove')?.removeEventListener('click', this.onRemoveClick)
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render()
  }

  private onRemoveClick = (): void => {
    this.dispatchEvent(new CustomEvent('nuxy-tag-remove', { bubbles: true, composed: true }))
  }

  private render(): void {
    const variant = this.getAttribute('variant') ?? 'default'
    const removable = this.hasAttribute('removable')
    const extraClass = this.getAttribute('class') ?? ''

    syncHostClasses(this, 'nuxy-tag', variant !== 'default' ? `nuxy-tag--${variant}` : '', removable ? 'nuxy-tag--removable' : '')

    let label = this.querySelector('.nuxy-tag__label')
    const btn = this.querySelector('.nuxy-tag__remove')
    const nodes: Node[] = []
    for (const child of this.childNodes) {
      if (child === label || child === btn) continue
      nodes.push(child)
    }

    if (!label) {
      label = document.createElement('span')
      label.className = 'nuxy-tag__label'
      this.insertBefore(label, btn)
    }
    if (nodes.length) {
      label.replaceChildren(...nodes)
    }

    if (removable && !btn) {
      const removeBtn = document.createElement('button')
      removeBtn.type = 'button'
      removeBtn.className = 'nuxy-tag__remove'
      removeBtn.setAttribute('aria-label', 'Remove')
      removeBtn.innerHTML = REMOVE_SVG
      removeBtn.addEventListener('click', this.onRemoveClick)
      this.appendChild(removeBtn)
    } else if (!removable && btn) {
      btn.remove()
    }
  }
}

if (!customElements.get('nuxy-tag')) {
  customElements.define('nuxy-tag', NuxyTagElement)
}
