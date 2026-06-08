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
    bridge.resetToolState()
    const snap = bridge.getSnapshot()
    expect(snap.toolActions).toEqual([])
    expect(snap.keyActionHints).toEqual([])
    expect(snap.footerPortal).toBeNull()
  })

  it('controlOmniBar notifies subscribers', () => {
    const bridge = createShellBridge()
    const handler = vi.fn()
    bridge.subscribeOmniBarControl(handler)
    bridge.controlOmniBar('hide')
    expect(handler).toHaveBeenCalledWith('hide')
  })
})
