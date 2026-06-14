import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeHost } from './helpers.ts'

describe('NavigationController', () => {
  let NavigationController: typeof import('../controllers/navigation-controller.ts').NavigationController

  beforeEach(async () => {
    ;({ NavigationController } = await import('../controllers/navigation-controller.ts'))
  })

  it('registers itself with the host on construction', () => {
    const host = makeHost()
    new NavigationController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes selectedIndex to -1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    expect(ctrl.selectedIndex).toBe(-1)
  })

  it('setSelectedIndex with a number updates index and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.setSelectedIndex(2)
    expect(ctrl.selectedIndex).toBe(2)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setSelectedIndex with a function receives the current index', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.setSelectedIndex(3)
    host.requestUpdate.mockClear()
    ctrl.setSelectedIndex((prev) => prev + 1)
    expect(ctrl.selectedIndex).toBe(4)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('moveDown increments selectedIndex within list bounds', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.moveDown(5)
    expect(ctrl.selectedIndex).toBe(0)
    ctrl.setSelectedIndex(3)
    host.requestUpdate.mockClear()
    ctrl.moveDown(5)
    expect(ctrl.selectedIndex).toBe(4)
  })

  it('moveDown does not exceed list length - 1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.setSelectedIndex(4)
    host.requestUpdate.mockClear()
    ctrl.moveDown(5)
    expect(ctrl.selectedIndex).toBe(4)
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })

  it('moveUp decrements selectedIndex with floor of -1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.setSelectedIndex(2)
    host.requestUpdate.mockClear()
    ctrl.moveUp()
    expect(ctrl.selectedIndex).toBe(1)
  })

  it('moveUp does not go below -1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    // selectedIndex starts at -1
    ctrl.moveUp()
    expect(ctrl.selectedIndex).toBe(-1)
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })

  it('reset sets selectedIndex to -1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.setSelectedIndex(3)
    host.requestUpdate.mockClear()
    ctrl.reset()
    expect(ctrl.selectedIndex).toBe(-1)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('reset is a no-op if already at -1', () => {
    const host = makeHost()
    const ctrl = new NavigationController(host)
    ctrl.reset()
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })
})
