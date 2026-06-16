import { describe, it, expect, beforeEach } from 'vitest'
import { makeHost } from './helpers.ts'

describe('CommandPaletteController', () => {
  let CommandPaletteController: typeof import('../controllers/command-palette-controller.ts').CommandPaletteController

  beforeEach(async () => {
    ;({ CommandPaletteController } = await import('../controllers/command-palette-controller.ts'))
  })

  it('registers itself with the host', () => {
    const host = makeHost()
    new CommandPaletteController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes showCommandPalette to false', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    expect(ctrl.showCommandPalette).toBe(false)
  })

  it('toggle opens when closed', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.toggle()
    expect(ctrl.showCommandPalette).toBe(true)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('toggle closes when open', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.toggle()
    host.requestUpdate.mockClear()
    ctrl.toggle()
    expect(ctrl.showCommandPalette).toBe(false)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('close sets showCommandPalette to false', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.toggle()
    host.requestUpdate.mockClear()
    ctrl.close()
    expect(ctrl.showCommandPalette).toBe(false)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('close is a no-op when already closed', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.close()
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })

  it('open sets showCommandPalette to true', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.open()
    expect(ctrl.showCommandPalette).toBe(true)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('open is a no-op when already open', () => {
    const host = makeHost()
    const ctrl = new CommandPaletteController(host)
    ctrl.toggle()
    host.requestUpdate.mockClear()
    ctrl.open()
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })
})
