const React = window.React
const { useState, useRef } = React

import type { Position, Size } from '../types.ts'
import { getZoom } from '../utils/zoom.ts'

export function useDragResize(containerRef: React.RefObject<HTMLDivElement | null>): {
  position: Position
  size: Size
  setPosition: React.Dispatch<React.SetStateAction<Position>>
  setSize: React.Dispatch<React.SetStateAction<Size>>
  hasDragged: React.MutableRefObject<boolean>
  isDraggingState: boolean
  handleDragMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  handleResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, direction: string) => void
} {
  const [position, setPosition] = useState<Position>(() => {
    const zoom = getZoom()
    const dw = window.innerWidth / zoom
    const dh = window.innerHeight / zoom
    return {
      x: Math.round((dw - 800) / 2),
      y: Math.round(dh * 0.15),
    }
  })
  const [size, setSize] = useState<Size>({ width: null, height: null })
  const hasDragged = useRef<boolean>(false)
  const isDragging = useRef<boolean>(false)
  const [isDraggingState, setIsDraggingState] = useState<boolean>(false)

  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault()
    isDragging.current = true
    setIsDraggingState(true)
    hasDragged.current = true

    let zoom = 1
    const zoomStyle = document.documentElement.style.zoom
    if (zoomStyle) {
      zoom = zoomStyle.endsWith('%') ? parseFloat(zoomStyle) / 100 : parseFloat(zoomStyle)
    }
    if (isNaN(zoom) || zoom <= 0) zoom = 1

    const startClientX = e.clientX
    const startClientY = e.clientY
    const startPosX = position.x
    const startPosY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom
      const winWidth = containerRef.current ? containerRef.current.offsetWidth : 0
      const winHeight = containerRef.current ? containerRef.current.offsetHeight : 0
      const dw = window.innerWidth / zoom
      const dh = window.innerHeight / zoom
      setPosition({
        x: Math.max(0, Math.min(startPosX + deltaX, Math.max(0, dw - winWidth))),
        y: Math.max(0, Math.min(startPosY + deltaY, Math.max(0, dh - winHeight))),
      })
    }
    const onMouseUp = () => {
      isDragging.current = false
      setIsDraggingState(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    setIsDraggingState(true)
    hasDragged.current = true

    const zoom = getZoom()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startWidth = containerRef.current!.offsetWidth
    const startHeight = containerRef.current!.offsetHeight
    const startX = position.x
    const startY = position.y

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return
      const deltaX = (moveEvent.clientX - startClientX) / zoom
      const deltaY = (moveEvent.clientY - startClientY) / zoom

      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startX
      let newY = startY

      if (direction.includes('e')) newWidth = startWidth + deltaX
      if (direction.includes('w')) { newWidth = startWidth - deltaX; newX = startX + deltaX }
      if (direction.includes('s')) newHeight = startHeight + deltaY
      if (direction.includes('n')) { newHeight = startHeight - deltaY; newY = startY + deltaY }

      if (newWidth < 300) {
        if (direction.includes('w')) newX -= 300 - newWidth
        newWidth = 300
      }
      if (newHeight < 100) {
        if (direction.includes('n')) newY -= 100 - newHeight
        newHeight = 100
      }

      setSize({ width: newWidth, height: newHeight })
      if (newX !== startX || newY !== startY) setPosition({ x: newX, y: newY })
    }

    const onMouseUp = () => {
      isDragging.current = false
      setIsDraggingState(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return {
    position,
    size,
    setPosition,
    setSize,
    hasDragged,
    isDraggingState,
    handleDragMouseDown,
    handleResizeMouseDown,
  }
}
