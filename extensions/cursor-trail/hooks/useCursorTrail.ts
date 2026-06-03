const React = window.React

export interface TrailPoint {
  x: number
  y: number
  alpha: number
  size: number
}

export function useCursorTrail() {
  React.useEffect(() => {
    const trailRef = { current: [] as TrailPoint[] }
    const rafIdRef = { current: null as number | null }
    const canvasRef = { current: null as HTMLCanvasElement | null }
    const ctxRef = { current: null as CanvasRenderingContext2D | null }

    function animate() {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!ctx || !canvas) {
        rafIdRef.current = null
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const color =
        getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
        '#6ec3f4'

      const trail = trailRef.current
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i]
        p.alpha -= 0.04
        p.size *= 0.93
        if (p.alpha <= 0) {
          trail.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(p.size, 0.5), 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (trailRef.current.length > 0) {
        rafIdRef.current = requestAnimationFrame(animate)
      } else {
        rafIdRef.current = null
      }
    }

    function onResize() {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function onMouseMove(e: MouseEvent) {
      trailRef.current.push({ x: e.clientX, y: e.clientY, alpha: 1, size: 5 })
      if (trailRef.current.length > 25) trailRef.current.shift()
      if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(animate)
    }

    function initTrail() {
      if (document.getElementById('nuxy-cursor-trail-canvas')) return

      const canvas = document.createElement('canvas')
      canvas.id = 'nuxy-cursor-trail-canvas'
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '10000',
      })
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvasRef.current = canvas
      ctxRef.current = canvas.getContext('2d')
      document.body.appendChild(canvas)

      window.addEventListener('resize', onResize)
      window.addEventListener('mousemove', onMouseMove)
    }

    function onShellMounted(e: Event) {
      const container = (e as CustomEvent).detail?.container
      if (container) initTrail()
    }

    window.addEventListener('nuxy-shell-mounted', onShellMounted)

    const existingContainer = document.querySelector('.nuxy-shell-container') as HTMLElement | null
    if (existingContainer) initTrail()

    return () => {
      window.removeEventListener('nuxy-shell-mounted', onShellMounted)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      canvasRef.current?.remove()
    }
  }, [])
}
