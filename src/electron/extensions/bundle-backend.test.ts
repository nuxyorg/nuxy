import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { bundleExtensionBackend } from './bundle-backend.js'

describe('bundleExtensionBackend', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-bundle-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('rejects backends that import fs', () => {
    const entryPath = path.join(tmpDir, 'backend.ts')
    fs.writeFileSync(
      entryPath,
      `export async function register() {
  await import('fs')
}
`
    )

    expect(() => bundleExtensionBackend(entryPath, tmpDir)).toThrow(
      /Node built-in "fs" is not allowed/
    )
  })

  it('bundles legitimate extension backends', async () => {
    const entryPath = path.join(tmpDir, 'backend.ts')
    fs.writeFileSync(
      entryPath,
      `export function register(core) {
  core.registry.registerTool({ name: 'test-tool' })
}
`
    )

    const bundledPath = bundleExtensionBackend(entryPath, tmpDir)
    const mod = await import(/* @vite-ignore */ bundledPath)

    expect(typeof mod.register).toBe('function')
    const registerTool = vi.fn()
    mod.register({ registry: { registerTool } })
    expect(registerTool).toHaveBeenCalledWith({ name: 'test-tool' })
  })

  it('bundled output has no static fs import paths', () => {
    const entryPath = path.join(tmpDir, 'backend.ts')
    fs.writeFileSync(
      entryPath,
      `export function register(core) {
  core.registry.registerTool({ name: 'test-tool' })
}
`
    )

    const bundledPath = bundleExtensionBackend(entryPath, tmpDir)
    const code = fs.readFileSync(bundledPath, 'utf8')

    expect(code).not.toMatch(/from\s+['"]fs['"]/)
    expect(code).not.toMatch(/from\s+['"]node:fs['"]/)
    expect(code).not.toMatch(/import\s*\(\s*['"]fs['"]/)
  })
})
