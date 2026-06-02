const React = window.React

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  radius: number
}

let particles: Particle[] = []
let rafId: number | null = null

if (typeof window !== 'undefined') {
  const initParticles = () => {
    if (document.getElementById('nuxy-particles-canvas')) return

    const canvas = document.createElement('canvas')
    canvas.id = 'nuxy-particles-canvas'
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '9998'
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.appendChild(canvas)

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    })

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function animate() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height)

      const color =
        getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
        '#6ec3f4'

      particles = particles.filter((p) => p.alpha > 0.01)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.alpha -= 0.025
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = color
        ctx!.globalAlpha = p.alpha
        ctx!.fill()
        ctx!.globalAlpha = 1
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(animate)
      } else {
        rafId = null
      }
    }

    window.addEventListener('keydown', () => {
      const w = canvas.width
      const h = canvas.height

      for (let i = 0; i < 10; i++) {
        particles.push({
          x: w * 0.2 + Math.random() * w * 0.6,
          y: h * 0.2 + Math.random() * h * 0.6,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 2,
          radius: Math.random() * 2 + 1.5,
          alpha: 1,
        })
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(animate)
      }
    })
  }

  window.addEventListener('nuxy-shell-mounted', () => {
    initParticles()
  })

  const existing = document.querySelector('.nuxy-shell-container') as HTMLElement | null
  if (existing) {
    initParticles()
  }
}

export default function ParticlesView() {
  return null
}
