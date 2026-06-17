// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactiveControllerHost } from '@nuxyorg/core'
import type { ShellConfig } from '../types.ts'

function makeHost(): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  }
}

const defaultSettings: ShellConfig = {
  windowWidth: 800,
  windowMaxHeight: 600,
  opacity: 1,
}

describe('WindowController', () => {
  let WindowController: typeof import('../controllers/window-controller.ts').WindowController

  beforeEach(async () => {
    vi.resetModules()
    ;({ WindowController } = await import('../controllers/window-controller.ts'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers itself with the host', () => {
    const host = makeHost()
    new WindowController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes with default position and null size', () => {
    const host = makeHost()
    const ctrl = new WindowController(host)
    expect(ctrl.position).toEqual({ x: expect.any(Number), y: expect.any(Number) })
    expect(ctrl.size).toEqual({ width: null, height: null })
    expect(ctrl.isDraggingState).toBe(false)
  })

  it('setPosition updates position and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new WindowController(host)
    ctrl.setPosition({ x: 100, y: 200 })
    expect(ctrl.position).toEqual({ x: 100, y: 200 })
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setSize updates size and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new WindowController(host)
    ctrl.setSize({ width: 900, height: 500 })
    expect(ctrl.size).toEqual({ width: 900, height: 500 })
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setDragging updates isDraggingState and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new WindowController(host)
    ctrl.setDragging(true)
    expect(ctrl.isDraggingState).toBe(true)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  describe('containerStyle', () => {
    it('returns left and top from position', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      ctrl.setPosition({ x: 150, y: 250 })
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.left).toBe('150px')
      expect(style.top).toBe('250px')
    })

    it('uses windowWidth from settings when no manual size', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle({ windowWidth: 700, windowMaxHeight: 600 }, null, false)
      expect(style.width).toBe('700px')
      expect(style.maxWidth).toBe('700px')
    })

    it('uses manual size.width when set', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      ctrl.setSize({ width: 1000, height: null })
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.width).toBe('1000px')
      expect(style.maxWidth).toBe('none')
    })

    it('sets height to windowMaxHeight when activeTool is set', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle({ windowMaxHeight: 600 }, 'calc', false)
      expect(style.height).toBe('600px')
    })

    it('sets height to undefined when no activeTool and no manual size', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.height).toBeUndefined()
    })

    it('uses manual size.height when set', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      ctrl.setSize({ width: null, height: 400 })
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.height).toBe('400px')
    })

    it('sets opacity from settings', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle({ opacity: 0.8 }, null, false)
      expect(style.opacity).toBe('0.8')
    })

    it('sets transition to none during dragging', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      ctrl.setDragging(true)
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.transition).toBe('none')
    })

    it('sets transition to none during initial load', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle(defaultSettings, null, true)
      expect(style.transition).toBe('none')
    })

    it('sets transition to spring animation when not dragging', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const style = ctrl.containerStyle(defaultSettings, null, false)
      expect(style.transition).toContain('cubic-bezier')
    })
  })

  describe('handleDragMouseDown', () => {
    function makeContainer(): HTMLElement {
      const el = document.createElement('div')
      vi.spyOn(el, 'offsetWidth', 'get').mockReturnValue(400)
      vi.spyOn(el, 'offsetHeight', 'get').mockReturnValue(300)
      return el
    }

    it('reads container offsetWidth/offsetHeight only once per drag, not on every mousemove', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const container = makeContainer()
      const widthSpy = vi.spyOn(container, 'offsetWidth', 'get')
      const heightSpy = vi.spyOn(container, 'offsetHeight', 'get')

      const mouseDown = new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      ctrl.handleDragMouseDown(mouseDown, container)

      expect(widthSpy).toHaveBeenCalledTimes(1)
      expect(heightSpy).toHaveBeenCalledTimes(1)

      for (let i = 0; i < 20; i++) {
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 + i, clientY: 10 + i }))
      }

      // Re-reading offsetWidth/offsetHeight inside the mousemove handler forces a
      // synchronous layout on every drag event (since the previous iteration just
      // wrote style.left/top) — this caused the reported "jumpy" dragging.
      expect(widthSpy).toHaveBeenCalledTimes(1)
      expect(heightSpy).toHaveBeenCalledTimes(1)

      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    it('updates container position and clamps to viewport while dragging', () => {
      const host = makeHost()
      const ctrl = new WindowController(host)
      const container = makeContainer()
      ctrl.setPosition({ x: 50, y: 50 })

      const mouseDown = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 })
      ctrl.handleDragMouseDown(mouseDown, container)

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 140 }))
      expect(ctrl.position).toEqual({ x: 80, y: 90 })
      expect(container.style.left).toBe('80px')
      expect(container.style.top).toBe('90px')

      window.dispatchEvent(new MouseEvent('mouseup'))

      // mousemove after mouseup should be ignored
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }))
      expect(ctrl.position).toEqual({ x: 80, y: 90 })
    })
  })
})
