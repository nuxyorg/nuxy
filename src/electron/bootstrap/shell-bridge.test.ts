import { describe, it, expect, vi } from 'vitest'
import { createShellBridge } from './shell-bridge.js'

describe('createShellBridge', () => {
  it('registerKeyActions exposes hints via snapshot', () => {
    const bridge = createShellBridge()
    const handler = vi.fn()
    bridge.registerKeyActions(() => [
      { key: 'Enter', label: 'Run', hint: '↵', handler, activeOn: () => true },
      { key: 'x', label: 'Hidden', handler, activeOn: () => false },
    ])
    expect(bridge.getSnapshot().keyActionHints).toHaveLength(1)
    expect(bridge.getSnapshot().keyActionHints[0]?.label).toBe('Run')
  })

  it('registerActions and portal elements appear in snapshot', () => {
    const bridge = createShellBridge()
    const portal = { tagName: 'DIV' } as unknown as HTMLElement
    bridge.registerActions([{ id: 'a', label: 'Action A' }])
    bridge.setOmniBarPortal(portal)
    const snap = bridge.getSnapshot()
    expect(snap.toolActions).toHaveLength(1)
    expect(snap.omniBarPortal).toBe(portal)
  })

  it('resetToolState clears tool registrations', () => {
    const bridge = createShellBridge()
    bridge.registerActions([{ id: 'a', label: 'Action A' }])
    bridge.registerKeyActions(() => [])
    bridge.setFooterPortal({ tagName: 'DIV' } as unknown as HTMLElement)
    bridge.setSearchPlaceholder('Search in settings')
    bridge.resetToolState()
    const snap = bridge.getSnapshot()
    expect(snap.toolActions).toEqual([])
    expect(snap.keyActionHints).toEqual([])
    expect(snap.footerPortal).toBeNull()
    expect(snap.searchPlaceholder).toBeNull()
  })

  it('resetToolState can keep searchPlaceholder during tool-to-tool switch', () => {
    const bridge = createShellBridge()
    bridge.setSearchPlaceholder('Search through Nyaa')
    bridge.resetToolState({ clearSearchPlaceholder: false })
    expect(bridge.getSnapshot().searchPlaceholder).toBe('Search through Nyaa')
  })

  it('setSearchPlaceholder appears in snapshot and notifies subscribers', () => {
    const bridge = createShellBridge()
    const listener = vi.fn()
    bridge.subscribe(listener)
    bridge.setSearchPlaceholder('Type anything to search in Nyaa')
    expect(bridge.getSnapshot().searchPlaceholder).toBe('Type anything to search in Nyaa')
    expect(listener).toHaveBeenCalled()
    bridge.setSearchPlaceholder(null)
    expect(bridge.getSnapshot().searchPlaceholder).toBeNull()
  })

  it('controlOmniBar notifies subscribers', () => {
    const bridge = createShellBridge()
    const handler = vi.fn()
    bridge.subscribeOmniBarControl(handler)
    bridge.controlOmniBar('hide')
    expect(handler).toHaveBeenCalledWith('hide')
  })

  it('returnToShell invokes bound handler', () => {
    const bridge = createShellBridge()
    const handler = vi.fn()
    bridge.bindReturnToShell(handler)
    bridge.returnToShell()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('deferred unregisterKeyActions does not clear a newer registration', async () => {
    const bridge = createShellBridge()
    const oldHandler = vi.fn()
    const newHandler = vi.fn()

    bridge.registerKeyActions(() => [
      { key: 'n', modifiers: ['ctrl'], label: 'Old', hint: '⌃N', handler: oldHandler },
    ])
    bridge.registerKeyActions(null)
    bridge.registerKeyActions(() => [
      { key: 'n', modifiers: ['ctrl'], label: 'New', hint: '⌃N', handler: newHandler },
    ])

    await new Promise((resolve) => queueMicrotask(resolve))

    expect(bridge.getSnapshot().keyActionHints).toHaveLength(1)
    expect(bridge.getSnapshot().keyActionHints[0]?.label).toBe('New')
  })
})
