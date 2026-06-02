const React = window.React

interface TrailPoint {
  x: number
  y: number
  alpha: number
  size: number
}

let trail: TrailPoint[] = []
let rafId: number | null = null
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function animate() {
  if (!ctx || !canvas) {
    rafId = null
    return
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const color =
    getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#6ec3f4'

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

  if (trail.length > 0) {
    rafId = requestAnimationFrame(animate)
  } else {
    rafId = null
  }
}

function initTrail(container: HTMLElement) {
  if (document.getElementById('nuxy-cursor-trail-canvas')) return

  canvas = document.createElement('canvas')
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
  ctx = canvas.getContext('2d')
  document.body.appendChild(canvas)

  window.addEventListener('resize', () => {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  })

  window.addEventListener('mousemove', (e) => {
    trail.push({ x: e.clientX, y: e.clientY, alpha: 1, size: 5 })
    if (trail.length > 25) trail.shift()
    if (!rafId) rafId = requestAnimationFrame(animate)
  })
}

window.addEventListener('nuxy-shell-mounted', (e: Event) => {
  const container = (e as CustomEvent).detail?.container
  if (container) initTrail(container)
})

const existingContainer = document.querySelector('.nuxy-shell-container') as HTMLElement | null
if (existingContainer) initTrail(existingContainer)

export default function CursorTrailView() {
  return null
}
