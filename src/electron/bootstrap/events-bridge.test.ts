import { describe, it, expect, vi } from 'vitest'
import { createEventsBridge } from './events-bridge.js'

describe('createEventsBridge', () => {
  it('notifies subscribers on emit', () => {
    const events = createEventsBridge()
    const handler = vi.fn()
    events.on('locale-changed', handler)
    events.emit('locale-changed')
    expect(handler).toHaveBeenCalledWith(undefined)
  })

  it('passes detail for payload events', () => {
    const events = createEventsBridge()
    const handler = vi.fn()
    const payload = { theme: 'dark' }
    events.on('settings-updated', handler)
    events.emit('settings-updated', payload)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('unsubscribe stops notifications', () => {
    const events = createEventsBridge()
    const handler = vi.fn()
    const off = events.on('shell-reset', handler)
    off()
    events.emit('shell-reset')
    expect(handler).not.toHaveBeenCalled()
  })
})
