import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'
import type { Position, Size, ShellConfig } from '../types.ts'

function getZoom(): number {
  try {
    if (typeof document === 'undefined') return 1
    const z = document.documentElement.style.zoom
    if (!z) return 1
    if (z.endsWith('%')) return parseFloat(z) / 100
    return parseFloat(z) || 1
  } catch {
    return 1
  }
}

// CSS transition for properties not driven by JS spring (width, shadows, etc.)
export const TRANSITION_DURATION_MS = 1500
const STATIC_TRANSITION = `width ${TRANSITION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), max-width ${TRANSITION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), max-height ${TRANSITION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow ${TRANSITION_DURATION_MS + 1000}ms cubic-bezier(0.16, 1, 0.3, 1)`

// Spring parameters — tune independently
// v = (v + (target - x) * stiffness) * damping
const HEIGHT_SPRING = { stiffness: 0.5, damping: 0.25 } // ~25 frames to rest
const POSITION_SPRING = { stiffness: 0.5, damping: 0.25 }

interface Spring1D {
  value: number
  velocity: number
  target: number
}

function tickSpring(s: Spring1D, stiffness: number, damping: number): boolean {
  s.velocity = (s.velocity + (s.target - s.value) * stiffness) * damping
  s.value += s.velocity
  return Math.abs(s.target - s.value) >= 0.5 || Math.abs(s.velocity) >= 0.5
}

export class WindowController implements ReactiveController {
  private _position: Position
  private _size: Size = { width: null, height: null }
  private _isDraggingState = false
  private _isDragging = false
  hasDragged = false

  // Height spring
  private _springHeight: number | null = null
  private _heightSpring: Spring1D | null = null
  private _restingHeight: number | null = null
  private _onHeightComplete: (() => void) | null = null

  // Position spring
  private _posSpring: { x: Spring1D; y: Spring1D } | null = null

  // Shared rAF handle
  private _rafHandle: number | null = null

  get position(): Position {
    return this._position
  }
  get size(): Size {
    return this._size
  }
  get isDraggingState(): boolean {
    return this._isDraggingState
  }
  get restingHeight(): number | null {
    return this._restingHeight
  }
  get isAnimatingHeight(): boolean {
    return this._heightSpring !== null
  }
  get springHeight(): number | null {
    return this._springHeight
  }

  recordRestingHeight(h: number): void {
    this._restingHeight = h
  }

  animateToHeight(toH: number | null, fromH: number, onComplete?: () => void): void {
    const target = toH ?? this._restingHeight ?? fromH
    const startValue = this._heightSpring?.value ?? fromH
    const startVelocity = this._heightSpring?.velocity ?? 0
    const prevComplete = this._onHeightComplete

    this._heightSpring = { value: startValue, velocity: startVelocity, target }
    this._onHeightComplete = () => {
      prevComplete?.()
      onComplete?.()
    }
    this._springHeight = Math.round(startValue)
    this._startTick()
  }

  animatePosition(pos: Position): void {
    const startX = this._posSpring?.x.value ?? this._position.x
    const startY = this._posSpring?.y.value ?? this._position.y
    const velX = this._posSpring?.x.velocity ?? 0
    const velY = this._posSpring?.y.velocity ?? 0

    this._posSpring = {
      x: { value: startX, velocity: velX, target: pos.x },
      y: { value: startY, velocity: velY, target: pos.y },
    }
    this._startTick()
  }

  private _startTick(): void {
    if (this._rafHandle !== null) return
    this._rafHandle = requestAnimationFrame(() => this._tick())
  }

  private _tick(): void {
    let moving = false

    if (this._heightSpring) {
      const still = tickSpring(this._heightSpring, HEIGHT_SPRING.stiffness, HEIGHT_SPRING.damping)
      if (still) {
        this._springHeight = Math.round(this._heightSpring.value)
        moving = true
      } else {
        this._heightSpring = null
        this._springHeight = null
        const cb = this._onHeightComplete
        this._onHeightComplete = null
        cb?.()
      }
    }

    if (this._posSpring) {
      const xMoving = tickSpring(
        this._posSpring.x,
        POSITION_SPRING.stiffness,
        POSITION_SPRING.damping
      )
      const yMoving = tickSpring(
        this._posSpring.y,
        POSITION_SPRING.stiffness,
        POSITION_SPRING.damping
      )
      this._position = {
        x: Math.round(this._posSpring.x.value),
        y: Math.round(this._posSpring.y.value),
      }
      if (xMoving || yMoving) {
        moving = true
      } else {
        this._posSpring = null
      }
    }

    this.host.requestUpdate()

    if (moving) {
      this._rafHandle = requestAnimationFrame(() => this._tick())
    } else {
      this._rafHandle = null
    }
  }

  hostDisconnected(): void {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle)
      this._rafHandle = null
    }
  }

  constructor(private readonly host: ReactiveControllerHost) {
    const zoom = getZoom()
    const dw = (typeof window !== 'undefined' ? window.innerWidth : 1280) / zoom
    const dh = (typeof window !== 'undefined' ? window.innerHeight : 800) / zoom
    this._position = { x: Math.round((dw - 800) / 2), y: Math.round(dh * 0.15) }
    host.addController(this)
  }

  setPosition(pos: Position): void {
    this._posSpring = null
    this._position = pos
    this.host.requestUpdate()
  }

  setSize(size: Size): void {
    this._size = size
    this.host.requestUpdate()
  }

  setDragging(dragging: boolean): void {
    this._isDraggingState = dragging
    this._isDragging = dragging
    this.host.requestUpdate()
  }

  containerStyle(
    settings: ShellConfig,
    activeTool: string | null,
    isInitialLoad: boolean
  ): Record<string, string | undefined> {
    const { _position: position, _size: size, _isDraggingState: isDraggingState } = this
    const transition = isDraggingState || isInitialLoad ? 'none' : STATIC_TRANSITION

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: size.width
        ? `${size.width}px`
        : settings?.windowWidth
          ? `${settings.windowWidth}px`
          : undefined,
      height:
        this._springHeight !== null
          ? `${this._springHeight}px`
          : size.height
            ? `${size.height}px`
            : activeTool
              ? `${settings?.windowMaxHeight ?? 600}px`
              : undefined,
      maxWidth: size.width
        ? 'none'
        : settings?.windowWidth
          ? `${settings.windowWidth}px`
          : undefined,
      maxHeight: size.height ? 'none' : `${settings?.windowMaxHeight ?? 600}px`,
      '--shell-max-height': `${settings?.windowMaxHeight ?? 600}px`,
      opacity: settings?.opacity !== undefined ? String(settings.opacity) : undefined,
      transition,
    }
  }

  handleDragMouseDown(e: MouseEvent, containerRef: HTMLElement | null): void {
    if (e.button !== 0) return
    const target = (e.composedPath?.()[0] || e.target) as HTMLElement
    if (!(target instanceof HTMLInputElement)) e.preventDefault()
    this._isDragging = true
    this._isDraggingState = true
    this.hasDragged = true
    // Cancel position spring — drag takes over
    this._posSpring = null
    this.host.requestUpdate()

    const zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startPosX = this._position.x
    const startPosY = this._position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this._isDragging) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom
      const winWidth = containerRef ? containerRef.offsetWidth : 0
      const winHeight = containerRef ? containerRef.offsetHeight : 0
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      const newX = Math.max(0, Math.min(startPosX + deltaX, Math.max(0, dw - winWidth)))
      const newY = Math.max(0, Math.min(startPosY + deltaY, Math.max(0, dh - winHeight)))
      this._position = { x: newX, y: newY }
      if (containerRef) {
        containerRef.style.left = `${newX}px`
        containerRef.style.top = `${newY}px`
      }
    }

    const onMouseUp = () => {
      this._isDragging = false
      this._isDraggingState = false
      this.host.requestUpdate()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  handleResizeMouseDown(e: MouseEvent, direction: string, containerRef: HTMLElement | null): void {
    e.preventDefault()
    e.stopPropagation()
    this._isDragging = true
    this._isDraggingState = true
    this.hasDragged = true
    this.host.requestUpdate()

    const zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startWidth = containerRef?.offsetWidth ?? 0
    const startHeight = containerRef?.offsetHeight ?? 0
    const startX = this._position.x
    const startY = this._position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this._isDragging) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startX
      let newY = startY

      if (direction.includes('e')) newWidth = startWidth + deltaX
      if (direction.includes('w')) {
        newWidth = startWidth - deltaX
        newX = startX + deltaX
      }
      if (direction.includes('s')) newHeight = startHeight + deltaY
      if (direction.includes('n')) {
        newHeight = startHeight - deltaY
        newY = startY + deltaY
      }

      if (newWidth < 300) {
        if (direction.includes('w')) newX -= 300 - newWidth
        newWidth = 300
      }
      if (newHeight < 100) {
        if (direction.includes('n')) newY -= 100 - newHeight
        newHeight = 100
      }

      this._size = { width: newWidth, height: newHeight }
      if (newX !== startX || newY !== startY) this._position = { x: newX, y: newY }

      if (containerRef) {
        containerRef.style.width = `${newWidth}px`
        containerRef.style.height = `${newHeight}px`
        containerRef.style.left = `${newX}px`
        containerRef.style.top = `${newY}px`
        containerRef.style.maxWidth = 'none'
        containerRef.style.maxHeight = 'none'
      }
    }

    const onMouseUp = () => {
      this._isDragging = false
      this._isDraggingState = false
      this.host.requestUpdate()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
}
