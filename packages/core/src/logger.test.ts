import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createLogger } from './logger.js'

describe('createLogger', () => {
  const originalLogLevel = process.env.LOG_LEVEL

  beforeEach(() => {
    delete process.env.LOG_LEVEL
  })

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL
    } else {
      process.env.LOG_LEVEL = originalLogLevel
    }
    vi.restoreAllMocks()
  })

  describe('default level (warn)', () => {
    it('suppresses info and silly messages', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.info('hello')
      logger.silly('hello')

      expect(log).not.toHaveBeenCalled()
    })

    it('emits warn and error messages', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.warn('careful')
      logger.error('boom')

      expect(warn).toHaveBeenCalledTimes(1)
      expect(error).toHaveBeenCalledTimes(1)
    })
  })

  describe('LOG_LEVEL env var', () => {
    it('lowering to silly shows everything', () => {
      process.env.LOG_LEVEL = 'silly'
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.silly('a')
      logger.info('b')

      expect(log).toHaveBeenCalledTimes(2)
    })

    it('lowering to info shows info but not silly', () => {
      process.env.LOG_LEVEL = 'info'
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.silly('a')
      logger.info('b')

      expect(log).toHaveBeenCalledTimes(1)
    })

    it('raising to error suppresses warn', () => {
      process.env.LOG_LEVEL = 'error'
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.warn('careful')
      logger.error('boom')

      expect(warn).not.toHaveBeenCalled()
      expect(error).toHaveBeenCalledTimes(1)
    })

    it('is case-insensitive', () => {
      process.env.LOG_LEVEL = 'SILLY'
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.silly('a')

      expect(log).toHaveBeenCalledTimes(1)
    })

    it('falls back to warn for an unknown level value', () => {
      process.env.LOG_LEVEL = 'bogus'
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.info('skipped')
      logger.warn('shown')

      expect(log).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('console method selection', () => {
    it('uses console.log for silly and info', () => {
      process.env.LOG_LEVEL = 'silly'
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.silly('a')
      logger.info('b')

      expect(log).toHaveBeenCalledTimes(2)
    })

    it('uses console.warn for warn', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.warn('careful')

      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('uses console.error for error', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.error('boom')

      expect(error).toHaveBeenCalledTimes(1)
    })
  })

  describe('child namespacing', () => {
    it('combines parent and child namespace in the output line', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Kernel')
      const child = logger.child('Foo')

      child.error('failure')

      expect(error).toHaveBeenCalledTimes(1)
      const line = error.mock.calls[0][0] as string
      expect(line).toContain('[Kernel:Foo]')
    })

    it('supports nested children', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Kernel')
      const child = logger.child('Foo').child('Bar')

      child.error('failure')

      const line = error.mock.calls[0][0] as string
      expect(line).toContain('[Kernel:Foo:Bar]')
    })
  })

  describe('meta objects', () => {
    it('JSON-stringifies meta into the log line', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.error('failure', { code: 42, reason: 'bad' })

      const line = error.mock.calls[0][0] as string
      expect(line).toContain('"code": 42')
      expect(line).toContain('"reason": "bad"')
    })

    it('omits the extra block entirely when no meta is passed', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const logger = createLogger('Test')

      logger.error('failure')

      const line = error.mock.calls[0][0] as string
      expect(line.split('\n')).toHaveLength(1)
    })
  })

  describe('EIO handling', () => {
    it('swallows EIO errors thrown by the console method', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
        const err: any = new Error('write EIO')
        err.code = 'EIO'
        throw err
      })
      const logger = createLogger('Test')

      expect(() => logger.error('failure')).not.toThrow()
    })

    it('swallows errors with the write EIO message even without the code', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('write EIO')
      })
      const logger = createLogger('Test')

      expect(() => logger.error('failure')).not.toThrow()
    })

    it('propagates non-EIO errors thrown by the console method', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('disk full')
      })
      const logger = createLogger('Test')

      expect(() => logger.error('failure')).toThrow('disk full')
    })
  })
})
