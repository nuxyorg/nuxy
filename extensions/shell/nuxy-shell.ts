import type { CompositionSlotDeclaration } from '@nuxy/core'

export const SHELL_COMPOSITION_SLOTS: CompositionSlotDeclaration[] = [
  {
    name: 'background-layer',
    description: 'Full-bleed background behind shell chrome',
    maxMounts: 1,
  },
  {
    name: 'footer-portal',
    description: 'Shortcut bar overlay region',
    maxMounts: 1,
  },
  {
    name: 'omnibar-portal',
    description: 'OmniBar accessory region',
    maxMounts: 1,
  },
]

const SHELL_EXT_ID = 'com.nuxy.shell'

type GradientMode = 'off' | 'light' | 'rainbow' | 'bit'

function gradientModeFromState(state: Record<string, unknown>): GradientMode {
  const active = Boolean(state.active)
  if (!active) return 'off'
  const mode = typeof state.mode === 'string' ? state.mode : 'light'
  if (mode === 'rainbow') return 'rainbow'
  if (mode === 'bit') return 'bit'
  return 'light'
}

export class NuxyShellElement extends HTMLElement {
  private compositionOff: (() => void) | null = null

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' })
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `nuxy-ext://${SHELL_EXT_ID}/nuxy-shell.css`
      shadow.appendChild(link)

      const frame = document.createElement('div')
      frame.className = 'shell-frame'

      const bgSlot = document.createElement('slot')
      bgSlot.name = 'background-layer'

      const content = document.createElement('div')
      content.className = 'shell-content'
      const mainSlot = document.createElement('slot')
      content.appendChild(mainSlot)

      frame.appendChild(bgSlot)
      frame.appendChild(content)
      shadow.appendChild(frame)
    }

    if (!this.hasAttribute('gradient-mode')) {
      this.setAttribute('gradient-mode', 'off')
    }

    window.core?.composition?.declareSlots(SHELL_COMPOSITION_SLOTS)

    this.compositionOff = window.core?.composition?.onStateChange('background-layer', (state) => {
      this.setAttribute('gradient-mode', gradientModeFromState(state))
    }) ?? null

    window.core?.events?.emit('composition-ready')
  }

  disconnectedCallback(): void {
    this.compositionOff?.()
    this.compositionOff = null
  }
}

export function registerNuxyShell(): void {
  if (!customElements.get('nuxy-shell')) {
    customElements.define('nuxy-shell', NuxyShellElement)
  }
}

registerNuxyShell()
