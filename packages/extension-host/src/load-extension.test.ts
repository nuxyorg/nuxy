import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { loadExtensionModule } from './load-extension.js'
import type { WorkerLogger } from './worker-log.js'

function makeLogger(): WorkerLogger {
  return {
    silly: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  }
}

describe('loadExtensionModule', () => {
  const tmpDirs: string[] = []

  function mkTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-load-ext-test-'))
    tmpDirs.push(dir)
    return dir
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
    tmpDirs.length = 0
  })

  it('calls register(core) when module exports a plain register function', async () => {
    const dir = mkTmpDir()
    const file = path.join(dir, 'backend.mjs')
    fs.writeFileSync(file, `export function register(core) { core.calls.push('plain') }\n`, 'utf8')

    const core = { calls: [] as string[] }
    const logger = makeLogger()

    await loadExtensionModule(file, core as any, logger)

    expect(core.calls).toEqual(['plain'])
  })

  it('calls register(core) when module exports default-wrapped register', async () => {
    const dir = mkTmpDir()
    const file = path.join(dir, 'backend.mjs')
    fs.writeFileSync(
      file,
      `export default { register(core) { core.calls.push('default') } }\n`,
      'utf8'
    )

    const core = { calls: [] as string[] }
    const logger = makeLogger()

    await loadExtensionModule(file, core as any, logger)

    expect(core.calls).toEqual(['default'])
  })

  it('calls register(core) when module exports doubly-wrapped default.default.register', async () => {
    const dir = mkTmpDir()
    const file = path.join(dir, 'backend.mjs')
    fs.writeFileSync(
      file,
      `export default { default: { register(core) { core.calls.push('nested') } } }\n`,
      'utf8'
    )

    const core = { calls: [] as string[] }
    const logger = makeLogger()

    await loadExtensionModule(file, core as any, logger)

    expect(core.calls).toEqual(['nested'])
  })

  it('logs a warning and does not throw when module has no register export', async () => {
    const dir = mkTmpDir()
    const file = path.join(dir, 'backend.mjs')
    fs.writeFileSync(file, `export const somethingElse = 42\n`, 'utf8')

    const core = { calls: [] as string[] }
    const logger = makeLogger()

    await expect(loadExtensionModule(file, core as any, logger)).resolves.toBeUndefined()

    expect(logger.log).toHaveBeenCalledWith(
      'warn',
      'Loader',
      expect.stringContaining('No register() function found')
    )
    expect(core.calls).toEqual([])
  })

  it('transpiles a real .ts backend file and loads it successfully', async () => {
    let tsResolvable = true
    try {
      await import('typescript')
    } catch {
      tsResolvable = false
    }
    if (!tsResolvable) {
      console.warn('Skipping .ts transpilation test: typescript package not resolvable')
      return
    }

    const dir = mkTmpDir()
    const file = path.join(dir, 'backend.ts')
    fs.writeFileSync(
      file,
      `
      interface Core { calls: string[] }
      export function register(core: Core): void {
        core.calls.push('typescript')
      }
      `,
      'utf8'
    )

    const core = { calls: [] as string[] }
    const logger = makeLogger()

    // loadExtensionModule's .ts transpilation path expects absolutePath to be a
    // file:// URL string (matching how real callers invoke it, e.g.
    // src/electron/spawn/spawn.ts uses pathToFileURL(bundledPath).href).
    await loadExtensionModule(pathToFileURL(file).href, core as any, logger)

    expect(core.calls).toEqual(['typescript'])
    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'Loader',
      expect.stringContaining('Transpiled TS backend')
    )
  })
})
