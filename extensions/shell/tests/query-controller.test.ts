import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactiveControllerHost } from '@nuxy/core'

function makeHost(): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  }
}

describe('QueryController', () => {
  let QueryController: typeof import('../controllers/query-controller.ts').QueryController

  beforeEach(async () => {
    ;({ QueryController } = await import('../controllers/query-controller.ts'))
  })

  it('registers itself with the host on construction', () => {
    const host = makeHost()
    new QueryController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes query and savedQuery to empty string', () => {
    const host = makeHost()
    const ctrl = new QueryController(host)
    expect(ctrl.query).toBe('')
    expect(ctrl.savedQuery).toBe('')
  })

  it('setQuery updates query and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new QueryController(host)
    ctrl.setQuery('hello')
    expect(ctrl.query).toBe('hello')
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setSavedQuery updates savedQuery and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new QueryController(host)
    ctrl.setSavedQuery('world')
    expect(ctrl.savedQuery).toBe('world')
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('handleChange sets both query and savedQuery and calls requestUpdate once', () => {
    const host = makeHost()
    const ctrl = new QueryController(host)
    ctrl.handleChange('search term')
    expect(ctrl.query).toBe('search term')
    expect(ctrl.savedQuery).toBe('search term')
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('reset clears query and savedQuery to empty string', () => {
    const host = makeHost()
    const ctrl = new QueryController(host)
    ctrl.handleChange('some query')
    host.requestUpdate.mockClear()
    ctrl.reset()
    expect(ctrl.query).toBe('')
    expect(ctrl.savedQuery).toBe('')
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })
})
