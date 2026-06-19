// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DeeplinkController } from '../controllers/deeplink-controller.ts'
import type { Tool } from '../types.ts'

function tool(id: string): Tool {
  return { id, manifest: { id, name: id, version: '1.0.0', type: 'tool' } as any }
}

describe('DeeplinkController', () => {
  let offOpen: ReturnType<typeof vi.fn>
  let onOpen: ReturnType<typeof vi.fn>
  let openTool: ReturnType<typeof vi.fn>
  let getTools: ReturnType<typeof vi.fn>

  beforeEach(() => {
    offOpen = vi.fn()
    onOpen = vi.fn().mockReturnValue(offOpen)
    openTool = vi.fn()
    getTools = vi.fn().mockReturnValue([tool('com.nuxy.settings'), tool('com.nuxy.clipboard')])
    ;(window as any).core = { deeplink: { onOpen } }
  })

  afterEach(() => {
    delete (window as any).core
  })

  it('binds window.core.deeplink.onOpen on bind()', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('calls openTool with extensionId and path when payload extension is known', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    const handler = onOpen.mock.calls[0][0]
    handler({ extensionId: 'com.nuxy.settings', path: 'extension/nyaa', query: {} })
    expect(openTool).toHaveBeenCalledWith('com.nuxy.settings', 'extension/nyaa')
  })

  it('appends query params to the forwarded path string', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    const handler = onOpen.mock.calls[0][0]
    handler({
      extensionId: 'com.nuxy.clipboard',
      path: 'add',
      query: { url: 'https://example.com/file.iso' },
    })
    expect(openTool).toHaveBeenCalledWith(
      'com.nuxy.clipboard',
      'add?url=https%3A%2F%2Fexample.com%2Ffile.iso'
    )
  })

  it('forwards just the path with no "?" when query is empty', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    const handler = onOpen.mock.calls[0][0]
    handler({ extensionId: 'com.nuxy.settings', path: '', query: {} })
    expect(openTool).toHaveBeenCalledWith('com.nuxy.settings', '')
  })

  it('does not call openTool when the extension id is not in the known tools list', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    const handler = onOpen.mock.calls[0][0]
    handler({ extensionId: 'com.nuxy.unknown', path: 'foo', query: {} })
    expect(openTool).not.toHaveBeenCalled()
  })

  it('destroy() calls the unsubscribe function', () => {
    const ctrl = new DeeplinkController({ openTool, getTools })
    ctrl.bind()
    ctrl.destroy()
    expect(offOpen).toHaveBeenCalledTimes(1)
  })

  it('bind() is a no-op when window.core.deeplink is unavailable', () => {
    delete (window as any).core
    const ctrl = new DeeplinkController({ openTool, getTools })
    expect(() => ctrl.bind()).not.toThrow()
  })
})
