import type { ReactiveController, ReactiveControllerHost } from '@nuxy/core'
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

const SPRING_TRANSITION =
  'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)'

export class WindowController implements ReactiveController {
  private _position: Position
  private _size: Size = { width: null, height: null }
  private _isDraggingState = false
  private _isDragging = false
  hasDragged = false

  get position(): Position {
    return this._position
  }
  get size(): Size {
    return this._size
  }
  get isDraggingState(): boolean {
    return this._isDraggingState
  }

  constructor(private readonly host: ReactiveControllerHost) {
    const zoom = getZoom()
    const dw = (typeof window !== 'undefined' ? window.innerWidth : 1280) / zoom
    const dh = (typeof window !== 'undefined' ? window.innerHeight : 800) / zoom
    this._position = { x: Math.round((dw - 800) / 2), y: Math.round(dh * 0.15) }
    host.addController(this)
  }

  setPosition(pos: Position): void {
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
    const transition = isDraggingState || isInitialLoad ? 'none' : SPRING_TRANSITION

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: size.width
        ? `${size.width}px`
        : settings?.windowWidth
          ? `${settings.windowWidth}px`
          : undefined,
      height: size.height
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
