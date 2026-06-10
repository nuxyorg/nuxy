import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { resolvePreloadScriptPath } from './preload-path.js'

describe('resolvePreloadScriptPath', () => {
  it('prefers preload.js when both exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-preload-'))
    const dir = path.join(root, 'dist-electron')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'preload.mjs'), 'old')
    fs.writeFileSync(path.join(dir, 'preload.js'), 'new')
    expect(resolvePreloadScriptPath(root)).toBe(path.join(dir, 'preload.js'))
  })

  it('falls back to preload.mjs when preload.js is absent', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-preload-'))
    const dir = path.join(root, 'dist-electron')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'preload.mjs'), 'legacy')
    expect(resolvePreloadScriptPath(root)).toBe(path.join(dir, 'preload.mjs'))
  })
})
