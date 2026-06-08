import './index.css'

export class NuxyConversionCardElement extends HTMLElement {
  private observer = new MutationObserver(() => {
    if (this.isConnected) this.sync()
  })

  connectedCallback(): void {
    this.classList.add('nuxy-conversion-card')
    this.observer.observe(this, { childList: true, subtree: true })
    this.sync()
  }

  disconnectedCallback(): void {
    this.observer.disconnect()
  }

  private findMarkers(): {
    label: Element | null
    from: Element | null
    to: Element | null
  } {
    return {
      label: this.querySelector('[data-label]'),
      from: this.querySelector('[data-from]'),
      to: this.querySelector('[data-to]'),
    }
  }

  private ensureStructure(): {
    labelEl: HTMLDivElement | null
    fromPanel: HTMLDivElement
    toPanel: HTMLDivElement
  } {
    let labelEl = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__label')
    let body = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__body')
    let fromPanel = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__panel--from')
    let arrow = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__arrow')
    let toPanel = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__panel--to')

    if (!body) {
      body = document.createElement('div')
      body.className = 'nuxy-conversion-card__body'
      this.appendChild(body)
    }

    if (!fromPanel) {
      fromPanel = document.createElement('div')
      fromPanel.className = 'nuxy-conversion-card__panel nuxy-conversion-card__panel--from'
      body.insertBefore(fromPanel, body.firstChild)
    }

    if (!arrow) {
      arrow = document.createElement('div')
      arrow.className = 'nuxy-conversion-card__arrow'
      arrow.textContent = '→'
      body.appendChild(arrow)
    }

    if (!toPanel) {
      toPanel = document.createElement('div')
      toPanel.className = 'nuxy-conversion-card__panel nuxy-conversion-card__panel--to'
      body.appendChild(toPanel)
    }

    return { labelEl, fromPanel, toPanel }
  }

  private sync(): void {
    const { label, from, to } = this.findMarkers()

    for (const marker of [label, from, to]) {
      if (marker instanceof HTMLElement) {
        marker.hidden = true
        marker.style.display = 'none'
      }
    }

    let labelEl = this.querySelector<HTMLDivElement>('.nuxy-conversion-card__label')

    if (label) {
      if (!labelEl) {
        labelEl = document.createElement('div')
        labelEl.className = 'nuxy-conversion-card__label'
        const body = this.querySelector('.nuxy-conversion-card__body')
        this.insertBefore(labelEl, body)
      }
      labelEl.replaceChildren(...label.childNodes)
    } else if (labelEl) {
      labelEl.remove()
    }

    const { fromPanel, toPanel } = this.ensureStructure()
    fromPanel.replaceChildren(...(from ? from.childNodes : []))
    toPanel.replaceChildren(...(to ? to.childNodes : []))
  }
}

if (!customElements.get('nuxy-conversion-card')) {
  customElements.define('nuxy-conversion-card', NuxyConversionCardElement)
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-conversion-card': NuxyConversionCardElement
  }
}
