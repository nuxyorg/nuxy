const React = window.React

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  radius: number
}

export function useParticlesAnimation() {
  React.useEffect(() => {
    const particlesRef = { current: [] as Particle[] }
    const rafIdRef = { current: null as number | null }
    const canvasRef = { current: null as HTMLCanvasElement | null }
    const ctxRef = { current: null as CanvasRenderingContext2D | null }

    function animate() {
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const color =
        getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
        '#6ec3f4'

      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.01)

      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.alpha -= 0.025
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1
      }

      if (particlesRef.current.length > 0) {
        rafIdRef.current = requestAnimationFrame(animate)
      } else {
        rafIdRef.current = null
      }
    }

    function onKeyDown() {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = canvas.width
      const h = canvas.height

      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: w * 0.2 + Math.random() * w * 0.6,
          y: h * 0.2 + Math.random() * h * 0.6,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 2,
          radius: Math.random() * 2 + 1.5,
          alpha: 1,
        })
      }

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(animate)
      }
    }

    function resizeCanvas(canvas: HTMLCanvasElement) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function onResize() {
      if (canvasRef.current) resizeCanvas(canvasRef.current)
    }

    function initParticles() {
      if (document.getElementById('nuxy-particles-canvas')) return

      const canvas = document.createElement('canvas')
      canvas.id = 'nuxy-particles-canvas'
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '9998',
      })
      resizeCanvas(canvas)
      document.body.appendChild(canvas)
      canvasRef.current = canvas
      ctxRef.current = canvas.getContext('2d')

      window.addEventListener('resize', onResize)
      window.addEventListener('keydown', onKeyDown)
    }

    function onShellMounted() {
      initParticles()
    }

    window.addEventListener('nuxy-shell-mounted', onShellMounted)

    const existing = document.querySelector('.nuxy-shell-container') as HTMLElement | null
    if (existing) initParticles()

    return () => {
      window.removeEventListener('nuxy-shell-mounted', onShellMounted)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      canvasRef.current?.remove()
    }
  }, [])
}
