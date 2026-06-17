import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCallHost, resolveHostReply } from './call-host.ts'

describe('createCallHost / resolveHostReply', () => {
  let pending: Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >
  let postMessage: ReturnType<typeof vi.fn>
  let callHost: ReturnType<typeof createCallHost>

  beforeEach(() => {
    pending = new Map()
    postMessage = vi.fn()
    callHost = createCallHost(pending, postMessage)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('posts a host:call message and registers a pending entry', () => {
    void callHost('fs:readFile', '/tmp/a')
    expect(pending.size).toBe(1)
    expect(postMessage).toHaveBeenCalledTimes(1)
    const msg = postMessage.mock.calls[0][0]
    expect(msg).toMatchObject({
      kind: 'call',
      type: 'host:call',
      channel: 'fs:readFile',
      payload: '/tmp/a',
    })
    expect(typeof msg.id).toBe('string')
  })

  it('resolves the promise when resolveHostReply is called with a result', async () => {
    const promise = callHost('clipboard:readText')
    const id = postMessage.mock.calls[0][0].id as string

    resolveHostReply(pending, id, 'clipboard contents')

    await expect(promise).resolves.toBe('clipboard contents')
    expect(pending.size).toBe(0)
  })

  it('rejects the promise when resolveHostReply is called with an error', async () => {
    const promise = callHost('fs:readFile')
    const id = postMessage.mock.calls[0][0].id as string

    resolveHostReply(pending, id, undefined, 'Permission Denied')

    await expect(promise).rejects.toThrow('Permission Denied')
    expect(pending.size).toBe(0)
  })

  it('is a no-op when resolving an unknown id', () => {
    expect(() => resolveHostReply(pending, 'does-not-exist', 'value')).not.toThrow()
  })

  it('times out and rejects after 30s without a reply', async () => {
    vi.useFakeTimers()
    const promise = callHost('fs:readFile')
    const assertion = expect(promise).rejects.toThrow(/timed out/)
    vi.advanceTimersByTime(30_000)
    await assertion
    expect(pending.size).toBe(0)
  })

  it('clears the timeout when a reply arrives before the deadline', async () => {
    vi.useFakeTimers()
    const promise = callHost('fs:readFile')
    const id = postMessage.mock.calls[0][0].id as string
    resolveHostReply(pending, id, 'ok')
    await expect(promise).resolves.toBe('ok')
    vi.advanceTimersByTime(30_000)
  })
})
