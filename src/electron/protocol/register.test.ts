import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createJsonModuleResponse } from './response.js'

describe('createJsonModuleResponse', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-json-module-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('serves JSON as an ES module with application/javascript MIME type', async () => {
    const jsonPath = path.join(tmpDir, 'manifest.json')
    fs.writeFileSync(jsonPath, JSON.stringify({ id: 'com.nuxy.nyaa', version: '1.0.0' }))

    const response = createJsonModuleResponse(jsonPath)

    expect(response.headers.get('Content-Type')).toBe('application/javascript')
    const body = await response.text()
    expect(body).toBe('export default {"id":"com.nuxy.nyaa","version":"1.0.0"};')
  })
})
