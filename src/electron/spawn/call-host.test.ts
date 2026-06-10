import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCallHost, resolveHostReply } from '../../../packages/extension-host/src/call-host.js'

describe('createCallHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('posts host:call message with id and channel', async () => {
    const pending = new Map<string, any>()
    const posts: unknown[] = []
    const callHost = createCallHost(pending, (msg) => posts.push(msg))

    const promise = callHost('testChannel', { x: 1 })
    expect(posts).toHaveLength(1)
    const msg = posts[0] as any
    expect(msg.type).toBe('host:call')
    expect(msg.channel).toBe('testChannel')
    expect(msg.payload).toEqual({ x: 1 })
    expect(typeof msg.id).toBe('string')

    // Resolve so the promise doesn't leak
    resolveHostReply(pending, msg.id, 'ok')
    await expect(promise).resolves.toBe('ok')
  })

  it('rejects with timeout error after 30s', async () => {
    const pending = new Map<string, any>()
    const callHost = createCallHost(pending, () => {})

    const promise = callHost('slowChannel')
    vi.advanceTimersByTime(30_000)
    await expect(promise).rejects.toThrow('timed out')
    expect(pending.size).toBe(0)
  })

  it('resolveHostReply clears timer and resolves', async () => {
    const pending = new Map<string, any>()
    const posts: unknown[] = []
    const callHost = createCallHost(pending, (msg) => posts.push(msg))

    const promise = callHost('ch')
    const id = (posts[0] as any).id
    resolveHostReply(pending, id, 42)

    await expect(promise).resolves.toBe(42)
    expect(pending.size).toBe(0)
    // Timer should be cleared — advancing past 30s should not throw
    vi.advanceTimersByTime(30_000)
  })

  it('resolveHostReply rejects on error field', async () => {
    const pending = new Map<string, any>()
    const posts: unknown[] = []
    const callHost = createCallHost(pending, (msg) => posts.push(msg))

    const promise = callHost('ch')
    const id = (posts[0] as any).id
    resolveHostReply(pending, id, undefined, 'bad thing')

    await expect(promise).rejects.toThrow('bad thing')
    expect(pending.size).toBe(0)
  })
})
