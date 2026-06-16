let layerStylesAdopted = false

function ensureLayerStyles(): void {
  if (layerStylesAdopted) return
  layerStylesAdopted = true
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`
    nuxy-gradient-layer {
      display: block;
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: inherit;
    }
    .nuxy-shell-gradient-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: var(--radius-xl);
      pointer-events: none;
      z-index: 0;
      display: block;
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
        visibility 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      --gradient-color-1: var(--gradient-1, #c3e4f5);
      --gradient-color-2: var(--gradient-2, #6ec3f4);
      --gradient-color-3: var(--gradient-3, #eae2ff);
      --gradient-color-4: var(--gradient-4, #b2c7f8);
    }
  `)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
}

export class NuxyGradientLayerElement extends HTMLElement {
  private gInstance: {
    play?: () => void
    pause?: () => void
    resize?: () => void
    mesh?: unknown
  } | null = null
  private observer: ResizeObserver | null = null
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null
  private compositionOff: (() => void) | null = null

  connectedCallback(): void {
    ensureLayerStyles()
    if (this.querySelector('#nuxy-shell-gradient-canvas')) return

    const canvas = document.createElement('canvas')
    canvas.id = 'nuxy-shell-gradient-canvas'
    canvas.className = 'nuxy-shell-gradient-canvas'
    this.appendChild(canvas)

    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport('nuxy-ext://com.nuxy.gradient/gradient.ts')
      .then(({ Gradient }: { Gradient: new () => Record<string, unknown> }) => {
        const g = new Gradient() as {
          initGradient: (selector: string) => void
          play?: () => void
          pause?: () => void
          resize?: () => void
          mesh?: unknown
        }
        g.initGradient('#nuxy-shell-gradient-canvas')
        this.gInstance = g
        g.pause?.()

        const shell = this.closest('nuxy-shell')
        if (shell) {
          this.observer = new ResizeObserver(() => {
            if (this.gInstance?.mesh) this.gInstance.resize?.()
          })
          this.observer.observe(shell)
        }
      })
      .catch((err: unknown) => {
        console.warn('Failed to load gradient shader inside shell:', err)
      })

    this.compositionOff =
      window.core?.composition?.onStateChange('background-layer', (state) => {
        this.applyCompositionState(state)
      }) ?? null
  }

  disconnectedCallback(): void {
    this.compositionOff?.()
    this.compositionOff = null
    this.observer?.disconnect()
    this.observer = null
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout)
  }

  private applyCompositionState(state: Record<string, unknown>): void {
    const active = Boolean(state.active)
    const mode = typeof state.mode === 'string' ? state.mode : 'light'
    const canvas = this.querySelector('#nuxy-shell-gradient-canvas') as HTMLElement | null

    if (active && mode === 'light') {
      if (this.pauseTimeout) {
        clearTimeout(this.pauseTimeout)
        this.pauseTimeout = null
      }
      if (canvas) {
        canvas.style.opacity = '1'
        canvas.style.visibility = 'visible'
      }
      this.gInstance?.play?.()
      requestAnimationFrame(() => {
        if (this.gInstance?.mesh) this.gInstance.resize?.()
      })
      return
    }

    if (canvas) {
      canvas.style.opacity = '0'
      canvas.style.visibility = 'hidden'
    }
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout)
    this.pauseTimeout = setTimeout(() => {
      this.gInstance?.pause?.()
      this.pauseTimeout = null
    }, 500)
  }
}

export function registerNuxyGradientLayer(): void {
  if (!customElements.get('nuxy-gradient-layer')) {
    customElements.define('nuxy-gradient-layer', NuxyGradientLayerElement)
  }
}

registerNuxyGradientLayer()
