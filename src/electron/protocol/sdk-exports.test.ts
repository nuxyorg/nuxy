import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

describe('nuxy-ext sdk virtual module exports', () => {
  it('re-exports invokeExtensionIpc for extension frontend IPC helpers', () => {
    const registerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'register.ts')
    const source = fs.readFileSync(registerPath, 'utf8')
    expect(source).toMatch(/invokeExtensionIpc,/)
  })
})
