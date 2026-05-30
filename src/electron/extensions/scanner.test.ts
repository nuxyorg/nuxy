import { describe, it, expect, vi } from 'vitest'
import { detectNodeImports } from './scanner.js'
import { createCoreProxy } from '../../../packages/extension-host/src/core-proxy.js'

describe('Extension Scanner Security', () => {
  describe('detectNodeImports', () => {
    it('should detect standard imports', () => {
      const code = `import fs from 'fs';`
      expect(detectNodeImports(code)).toEqual(['fs'])
    })

    it('should detect node: prefixed imports', () => {
      const code = `import fs from 'node:fs/promises';`
      expect(detectNodeImports(code)).toEqual(['node:fs/promises'])
    })

    it('should detect require calls', () => {
      const code = `const child = require('child_process');`
      expect(detectNodeImports(code)).toEqual(['child_process'])
    })

    it('should detect dynamic imports', () => {
      const code = `const fs = await import('fs');`
      expect(detectNodeImports(code)).toEqual(['fs'])
    })

    it('should ignore comments', () => {
      const code = `
        // import fs from 'fs';
        /* const path = require('path'); */
        const x = 5;
      `
      expect(detectNodeImports(code)).toEqual([])
    })

    it('should ignore non-node imports', () => {
      const code = `import { useState } from 'react';`
      expect(detectNodeImports(code)).toEqual([])
    })
  })
})

describe('Runtime Permission Enforcement', () => {
  const callHost = vi.fn().mockResolvedValue(null)
  const logger = {
    silly: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  }
  const registerIpcHandler = vi.fn()

  it('should allow clipboard calls when clipboard permission is present', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', ['clipboard'])
    await expect(core.clipboard.readText()).resolves.toBeNull()
  })

  it('should deny clipboard calls when clipboard permission is missing', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.clipboard.readText()).toThrow(/lacks "clipboard" permission/)
  })

  it('should allow fs calls when fs permission is present', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', ['fs'])
    await expect(core.fs.fileExists('foo')).resolves.toBeNull()
  })

  it('should deny fs calls when fs permission is missing', async () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.fs.fileExists('foo')).toThrow(/lacks "fs" permission/)
  })

  it('should allow db open when db permission is present', () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', ['db'])
    const db = core.db.open('foo')
    expect(db).toBeDefined()
  })

  it('should deny db open when db permission is missing', () => {
    const { core } = createCoreProxy(callHost, logger as any, registerIpcHandler, 'test-ext', [])
    expect(() => core.db.open('foo')).toThrow(/lacks "db" permission/)
  })
})
