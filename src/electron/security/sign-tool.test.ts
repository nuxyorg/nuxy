import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import {
  generateDeveloperKeys,
  sha256,
  computeDirectoryIntegrity,
  signDirectory,
} from './sign-tool.js'

describe('sign-tool', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-sign-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('generateDeveloperKeys', () => {
    it('returns PEM-formatted private and public keys', () => {
      const keys = generateDeveloperKeys()

      expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
      expect(keys.privateKey).toContain('-----END PRIVATE KEY-----')
      expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
      expect(keys.publicKey).toContain('-----END PUBLIC KEY-----')
    })

    it('generates a fresh key pair on every call', () => {
      const a = generateDeveloperKeys()
      const b = generateDeveloperKeys()

      expect(a.privateKey).not.toBe(b.privateKey)
    })
  })

  describe('sha256', () => {
    it('is deterministic for the same input', () => {
      expect(sha256('hello world')).toBe(sha256('hello world'))
    })

    it('matches Node crypto for known input', () => {
      const expected = crypto.createHash('sha256').update('hello world').digest('hex')
      expect(sha256('hello world')).toBe(expected)
    })

    it('matches Node crypto for buffer input', () => {
      const buf = Buffer.from([1, 2, 3, 4])
      const expected = crypto.createHash('sha256').update(buf).digest('hex')
      expect(sha256(buf)).toBe(expected)
    })

    it('produces different hashes for different input', () => {
      expect(sha256('a')).not.toBe(sha256('b'))
    })
  })

  describe('computeDirectoryIntegrity', () => {
    it('walks nested directories and hashes every file', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.js'), 'const a = 1;')
      fs.mkdirSync(path.join(tmpDir, 'nested'))
      fs.writeFileSync(path.join(tmpDir, 'nested', 'b.js'), 'const b = 2;')

      const result = computeDirectoryIntegrity(tmpDir)

      expect(Object.keys(result.files).sort()).toEqual(['a.js', 'nested/b.js'])
      expect(result.hash).toBeTruthy()
    })

    it('skips node_modules, .git, and signature.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log(1);')
      fs.mkdirSync(path.join(tmpDir, 'node_modules'))
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.js'), 'dep')
      fs.mkdirSync(path.join(tmpDir, '.git'))
      fs.writeFileSync(path.join(tmpDir, '.git', 'HEAD'), 'ref')
      fs.writeFileSync(path.join(tmpDir, 'signature.json'), '{}')

      const result = computeDirectoryIntegrity(tmpDir)

      expect(Object.keys(result.files)).toEqual(['main.js'])
    })

    it('produces the same hash regardless of filesystem write order', () => {
      const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-sign-test-a-'))
      const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-sign-test-b-'))
      try {
        fs.mkdirSync(path.join(dirA, 'nested'))
        fs.writeFileSync(path.join(dirA, 'a.js'), 'content-a')
        fs.writeFileSync(path.join(dirA, 'nested', 'b.js'), 'content-b')

        fs.mkdirSync(path.join(dirB, 'nested'))
        fs.writeFileSync(path.join(dirB, 'nested', 'b.js'), 'content-b')
        fs.writeFileSync(path.join(dirB, 'a.js'), 'content-a')

        const resultA = computeDirectoryIntegrity(dirA)
        const resultB = computeDirectoryIntegrity(dirB)

        expect(resultA.hash).toBe(resultB.hash)
      } finally {
        fs.rmSync(dirA, { recursive: true, force: true })
        fs.rmSync(dirB, { recursive: true, force: true })
      }
    })

    it('changes the aggregate hash when file content changes', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.js'), 'const a = 1;')
      const before = computeDirectoryIntegrity(tmpDir)

      fs.writeFileSync(path.join(tmpDir, 'a.js'), 'const a = 2;')
      const after = computeDirectoryIntegrity(tmpDir)

      expect(after.hash).not.toBe(before.hash)
    })
  })

  describe('signDirectory', () => {
    it('produces a verifiable signature over the integrity hash', () => {
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("hi");')
      const keys = generateDeveloperKeys()

      const sigData = signDirectory(tmpDir, keys.privateKey, keys.publicKey)

      const verify = crypto.createVerify('SHA256')
      verify.update(sigData.integrity.hash)
      expect(verify.verify(keys.publicKey, sigData.signature, 'hex')).toBe(true)
      expect(sigData.publicKey).toBe(keys.publicKey)
    })

    it('fails verification when the integrity hash is tampered with', () => {
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("hi");')
      const keys = generateDeveloperKeys()

      const sigData = signDirectory(tmpDir, keys.privateKey, keys.publicKey)

      const verify = crypto.createVerify('SHA256')
      verify.update('tampered-hash')
      expect(verify.verify(keys.publicKey, sigData.signature, 'hex')).toBe(false)
    })
  })
})
