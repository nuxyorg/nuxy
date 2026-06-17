import { describe, it, expect, vi, afterEach } from 'vitest'
import { createWorkerLogger } from './worker-log.ts'

describe('createWorkerLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes info/silly/warn messages through console.log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'silly')

    logger.info('hello')
    logger.silly('debugging')

    expect(logSpy).toHaveBeenCalledTimes(2)
    expect(logSpy.mock.calls[0][0]).toContain('hello')
    expect(logSpy.mock.calls[0][0]).toContain('com.nuxy.test')
  })

  it('writes warn messages through console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'silly')

    logger.warn('careful')

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('careful')
  })

  it('writes error messages through console.error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'silly')

    logger.error('boom')

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('boom')
  })

  it('suppresses messages below the configured log level', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'warn')

    logger.silly('debug noise')
    logger.info('info noise')
    logger.warn('this matters')

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('appends serialized meta when provided', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'silly')

    logger.info('with meta', { count: 3 })

    expect(logSpy.mock.calls[0][0]).toContain('{"count":3}')
  })

  it('defaults to the "warn" threshold for unrecognized log levels', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createWorkerLogger('com.nuxy.test', 'not-a-real-level')

    logger.info('info noise')
    logger.warn('this matters')

    expect(logSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
