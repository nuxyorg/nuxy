const React = window.React

import { useGradientCanvas } from './hooks/useGradientCanvas.ts'

const CANVAS_ID = 'nuxy-gradient-canvas'

export default function GradientView() {
  useGradientCanvas()

  return React.createElement('canvas', {
    id: CANVAS_ID,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'block',
      zIndex: 9999,
    },
  })
}

// Self-attacher logic loaded on startup
if (typeof window !== 'undefined') {
  let gInstance: any = null
  let observer: ResizeObserver | null = null

  const initShellGradient = (container: HTMLElement) => {
    if (document.getElementById('nuxy-shell-gradient-canvas')) return

    const canvas = document.createElement('canvas')
    canvas.id = 'nuxy-shell-gradient-canvas'
    canvas.className = 'nuxy-shell-gradient-canvas'
    container.prepend(canvas)

    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport('nuxy-ext://com.nuxy.gradient/gradient.ts')
      .then(({ Gradient }: any) => {
        const g = new Gradient()
        g.initGradient('#nuxy-shell-gradient-canvas')
        gInstance = g

        g.pause?.()

        observer = new ResizeObserver(() => {
          if (g.mesh && g.mesh.geometry) {
            g.resize?.()
          }
        })
        observer.observe(container)
      })
      .catch((err: any) => {
        console.warn('Failed to load gradient shader inside shell:', err)
      })
  }

  let pauseTimeout: any = null

  const handleToggle = (e: Event) => {
    const detail = (e as CustomEvent).detail
    const active = typeof detail === 'object' && detail !== null ? detail.active : Boolean(detail)
    const mode: string = typeof detail === 'object' && detail !== null ? (detail.mode ?? 'light') : 'light'
    const container = document.querySelector('.nuxy-shell-container')
    if (container) {
      if (active) {
        if (pauseTimeout) {
          clearTimeout(pauseTimeout)
          pauseTimeout = null
        }
        if (mode === 'rainbow') {
          container.classList.add('nuxy-shell-container--gradient-rainbow')
        } else if (mode === 'bit') {
          container.classList.add('nuxy-shell-container--gradient-bit')
        } else {
          container.classList.add('nuxy-shell-container--gradient-active')
          gInstance?.play?.()
          requestAnimationFrame(() => {
            if (gInstance && gInstance.mesh && gInstance.mesh.geometry) {
              gInstance.resize?.()
            }
          })
        }
      } else {
        container.classList.remove('nuxy-shell-container--gradient-active')
        container.classList.remove('nuxy-shell-container--gradient-rainbow')
        container.classList.remove('nuxy-shell-container--gradient-bit')
        if (pauseTimeout) clearTimeout(pauseTimeout)
        pauseTimeout = setTimeout(() => {
          gInstance?.pause?.()
          pauseTimeout = null
        }, 500)
      }
    }
  }

  window.addEventListener('nuxy-gradient-toggle', handleToggle)

  window.addEventListener('nuxy-shell-mounted', (e: Event) => {
    const container = (e as CustomEvent).detail?.container
    if (container) {
      initShellGradient(container)
    }
  })

  const existing = document.querySelector('.nuxy-shell-container') as HTMLElement | null
  if (existing) {
    initShellGradient(existing)
  }
}
