import { LitElement, html, css, customElement, property } from '@nuxy/core'
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

type GradientMode = 'off' | 'light' | 'rainbow' | 'bit'

function gradientModeFromState(state: Record<string, unknown>): GradientMode {
  const active = Boolean(state.active)
  if (!active) return 'off'
  const mode = typeof state.mode === 'string' ? state.mode : 'light'
  if (mode === 'rainbow') return 'rainbow'
  if (mode === 'bit') return 'bit'
  return 'light'
}

@customElement('nuxy-shell')
export class NuxyShellElement extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      width: 100%;
      max-width: 800px;
      height: fit-content;
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      padding: 2px;
      box-sizing: border-box;
      background: var(--syntax-comment);
      overflow: hidden;
    }

    :host([gradient-mode='light']) {
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.6),
        0 0 30px -4px var(--gradient-color-2, rgba(110, 195, 244, 0.3));
      --gradient-color-1: var(--gradient-1, #c3e4f5);
      --gradient-color-2: var(--gradient-2, #6ec3f4);
      --gradient-color-3: var(--gradient-3, #eae2ff);
      --gradient-color-4: var(--gradient-4, #b2c7f8);
    }

    @property --nuxy-rainbow-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    @keyframes nuxy-rainbow-spin {
      to {
        --nuxy-rainbow-angle: 360deg;
      }
    }

    :host([gradient-mode='rainbow']) {
      animation: nuxy-rainbow-spin 4s linear infinite;
      background: conic-gradient(
        from var(--nuxy-rainbow-angle),
        hsl(0, 85%, 65%),
        hsl(60, 85%, 65%),
        hsl(120, 85%, 65%),
        hsl(180, 85%, 65%),
        hsl(240, 85%, 65%),
        hsl(300, 85%, 65%),
        hsl(360, 85%, 65%)
      );
      box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.6),
        0 0 30px -4px rgba(180, 100, 255, 0.4);
    }

    @property --nuxy-bit-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    @keyframes nuxy-bit-spin {
      to {
        --nuxy-bit-angle: 360deg;
      }
    }

    :host([gradient-mode='bit']) {
      animation: nuxy-bit-spin 3s linear infinite;
      background: conic-gradient(
        from var(--nuxy-bit-angle),
        var(--syntax-comment) 0deg,
        var(--syntax-comment) 340deg,
        rgba(255, 255, 255, 0) 350deg,
        rgba(255, 255, 255, 1) 358deg,
        rgba(255, 255, 255, 0) 360deg
      );
      box-shadow: 0 0 20px -4px rgba(255, 255, 255, 0.15);
    }

    .shell-frame {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      border-radius: inherit;
    }

    .shell-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    ::slotted([slot='background-layer']) {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      border-radius: inherit;
      overflow: hidden;
    }
  `

  @property({ reflect: true, attribute: 'gradient-mode' })
  declare gradientMode: string

  private compositionOff: (() => void) | null = null

  connectedCallback(): void {
    super.connectedCallback()
    if (!this.hasAttribute('gradient-mode')) {
      this.gradientMode = 'off'
    }
    window.core?.composition?.declareSlots(SHELL_COMPOSITION_SLOTS)
    this.compositionOff =
      window.core?.composition?.onStateChange('background-layer', (state) => {
        this.gradientMode = gradientModeFromState(state)
      }) ?? null
    window.core?.events?.emit('composition-ready')
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.compositionOff?.()
    this.compositionOff = null
  }

  render() {
    return html`
      <div class="shell-frame">
        <slot name="background-layer"></slot>
        <div class="shell-content">
          <slot></slot>
        </div>
      </div>
    `
  }
}

export function registerNuxyShell(): void {
  // customElement decorator already registers — kept for import-side-effect callers
}
