import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactiveControllerHost } from '@nuxy/core'
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
})
