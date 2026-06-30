import { describe, it, expect, vi, afterEach } from 'vitest'
import { logCaughtError } from './log-caught'

describe('logCaughtError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs scope and error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    logCaughtError('com.nuxy.test', err)
    expect(spy).toHaveBeenCalledWith('[com.nuxy.test]', err)
  })

  it('includes detail when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logCaughtError('com.nuxy.test', 'fail', 'getHistory')
    expect(spy).toHaveBeenCalledWith('[com.nuxy.test] getHistory', 'fail')
  })
})
