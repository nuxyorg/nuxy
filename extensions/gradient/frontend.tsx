const React = window.React
const { useEffect, useRef } = React

const EXT_ID = 'com.nuxy.gradient'
const CANVAS_ID = 'nuxy-gradient-canvas'

interface GradientInstance {
  height: number
  initGradient: (selector: string) => GradientInstance
  pause?: () => void
  play?: () => void
  resize?: () => void
  disconnect?: () => void
}

const COLORS: Record<string, string> = {
  '--gradient-color-1': 'var(--gradient-1, #c3e4f5)',
  '--gradient-color-2': 'var(--gradient-2, #6ec3f4)',
  '--gradient-color-3': 'var(--gradient-3, #eae2ff)',
  '--gradient-color-4': 'var(--gradient-4, #b2c7f8)',
}

export default function GradientView() {
  useEffect(() => {
    // When the gradient tool is opened, turn on the border glow
    window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: true }))

    const canvas = document.getElementById(CANVAS_ID)
    if (!canvas) return

    Object.entries(COLORS).forEach(([k, v]) => (canvas as HTMLElement).style.setProperty(k, v))

    const dynamicImport = new Function('url', 'return import(url)') as (
      url: string
    ) => Promise<{ Gradient: new () => GradientInstance }>

    let toolGInstance: any = null
    dynamicImport(`nuxy-ext://${EXT_ID}/gradient.ts`)
      .then(({ Gradient }) => {
        const g = new Gradient()
        g.height = window.innerHeight
        g.initGradient(`#${CANVAS_ID}`)
        toolGInstance = g
      })
      .catch(() => {})

    return () => {
      // Turn off the border glow when the gradient tool is closed
      window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))
      toolGInstance?.pause?.()
    }
  }, [])

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
    // Avoid double setup
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

        // Initially paused until toggle is activated
        g.pause?.()

        // Set up ResizeObserver
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

  // Handle toggles from other extensions
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

  // Listen to shell mount event
  window.addEventListener('nuxy-shell-mounted', (e: Event) => {
    const container = (e as CustomEvent).detail?.container
    if (container) {
      initShellGradient(container)
    }
  })

  // Check if shell container is already in DOM (fallback)
  const existing = document.querySelector('.nuxy-shell-container') as HTMLElement | null
  if (existing) {
    initShellGradient(existing)
  }
}
