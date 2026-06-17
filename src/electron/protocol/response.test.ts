import fs from 'fs'
import path from 'path'
import os from 'os'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MODULE_HEADERS, createJsonModuleResponse } from './response.js'

describe('createJsonModuleResponse', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-response-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns a Response whose body equals export default <json>; for an object', async () => {
    const filePath = path.join(tmpDir, 'data.json')
    const json = '{\n  "a": 1,\n  "b": "two"\n}'
    fs.writeFileSync(filePath, json, 'utf8')

    const response = createJsonModuleResponse(filePath)
    const text = await response.text()

    expect(text).toBe(`export default ${json};`)
  })

  it('sets all headers from MODULE_HEADERS', () => {
    const filePath = path.join(tmpDir, 'headers.json')
    fs.writeFileSync(filePath, '{}', 'utf8')

    const response = createJsonModuleResponse(filePath)

    for (const [key, value] of Object.entries(MODULE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value)
    }
  })

  it('throws when the file contains invalid JSON', () => {
    const filePath = path.join(tmpDir, 'invalid.json')
    fs.writeFileSync(filePath, '{ not valid json', 'utf8')

    expect(() => createJsonModuleResponse(filePath)).toThrow()
  })

  it('works for JSON arrays', async () => {
    const filePath = path.join(tmpDir, 'array.json')
    const json = '[1, 2, 3]'
    fs.writeFileSync(filePath, json, 'utf8')

    const response = createJsonModuleResponse(filePath)
    const text = await response.text()

    expect(text).toBe(`export default ${json};`)
  })

  it('works for JSON primitives', async () => {
    const filePath = path.join(tmpDir, 'primitive.json')
    const json = '42'
    fs.writeFileSync(filePath, json, 'utf8')

    const response = createJsonModuleResponse(filePath)
    const text = await response.text()

    expect(text).toBe(`export default ${json};`)
  })

  it('works for JSON string primitives', async () => {
    const filePath = path.join(tmpDir, 'string.json')
    const json = '"hello"'
    fs.writeFileSync(filePath, json, 'utf8')

    const response = createJsonModuleResponse(filePath)
    const text = await response.text()

    expect(text).toBe(`export default ${json};`)
  })

  it('propagates the fs read error when the file does not exist', () => {
    const filePath = path.join(tmpDir, 'missing.json')

    expect(() => createJsonModuleResponse(filePath)).toThrow()
  })
})
