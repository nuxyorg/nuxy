import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { bundleExtensionFrontend, FRONTEND_RUNTIME_ALIASES } from './bundle-frontend.js'

describe('bundleExtensionFrontend', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-frontend-bundle-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('keeps shared runtime packages external via nuxy-ext aliases', async () => {
    const entryPath = path.join(tmpDir, 'frontend.ts')
    fs.writeFileSync(
      entryPath,
      `import { LitElement, html } from '@nuxyorg/core'
import { createStore } from '@nuxyorg/extension-sdk'

export class Demo extends LitElement {
  store = createStore({ ok: true })
  render() { return html\`<div></div>\` }
}
`
    )

    const output = await bundleExtensionFrontend(entryPath, tmpDir)

    expect(output).toContain(`from "${FRONTEND_RUNTIME_ALIASES['@nuxyorg/core']}"`)
    expect(output).toContain(`from "${FRONTEND_RUNTIME_ALIASES['@nuxyorg/extension-sdk']}"`)
    expect(output).not.toContain("from '@nuxyorg/core'")
    expect(output).not.toContain("from '@nuxyorg/extension-sdk'")
  })

  it('writes bundle artifact when outfile is provided', async () => {
    const entryPath = path.join(tmpDir, 'frontend.ts')
    fs.writeFileSync(entryPath, `export const ready = true`)

    const outfile = path.join(tmpDir, '_frontend.bundle.mjs')
    const result = await bundleExtensionFrontend(entryPath, tmpDir, outfile)

    expect(result).toBe(outfile)
    expect(fs.readFileSync(outfile, 'utf8')).toContain('ready = true')
  })
})
