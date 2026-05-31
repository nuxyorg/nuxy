import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Self-contained paths mock to avoid variable hosting issues
vi.mock('../config/paths.js', () => {
  const os = require('os')
  const path = require('path')
  const mockHome = path.join(os.tmpdir(), 'nuxy-security-test-home')
  return {
    CONFIG_DIR: mockHome,
    DATA_DIR: path.join(mockHome, 'data'),
    EXTRACTED_DIR: path.join(mockHome, 'extracted'),
    EXTENSION_DIR: path.join(mockHome, 'extensions'),
  }
})

import {
  generateDeveloperKeys,
  computeDirectoryIntegrity,
  signDirectory,
} from './sign-tool.js'
import {
  getTrustedKeys,
  isKeyTrusted,
  addTrustedKey,
  clearTrustedKeys,
  loadStateCache,
  saveStateCache,
  isRevoked,
  verifyDirectoryIntegrity,
  makeDirectoryReadOnly,
} from './security.js'

describe('Security and Code Signing Suite', () => {
  let tmpDir: string
  const mockHome = path.join(os.tmpdir(), 'nuxy-security-test-home')

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-security-test-'))
    try {
      fs.mkdirSync(mockHome, { recursive: true })
    } catch {}
    clearTrustedKeys()
  })

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
      fs.rmSync(mockHome, { recursive: true, force: true })
    } catch {}
    clearTrustedKeys()
  })

  describe('sign-tool', () => {
    it('generates non-empty RSA key pairs', () => {
      const keys = generateDeveloperKeys()
      expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
      expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
    })

    it('deterministically hashes directory files', () => {
      fs.writeFileSync(path.join(tmpDir, 'file1.js'), 'const a = 1;')
      fs.writeFileSync(path.join(tmpDir, 'file2.js'), 'const b = 2;')

      const integrity1 = computeDirectoryIntegrity(tmpDir)

      // Recomputing should give the exact same aggregate hash
      const integrity2 = computeDirectoryIntegrity(tmpDir)
      expect(integrity1.hash).toBe(integrity2.hash)
      expect(integrity1.files['file1.js']).toBe(integrity2.files['file1.js'])

      // Modifying a file should change the aggregate hash
      fs.writeFileSync(path.join(tmpDir, 'file1.js'), 'const a = 3;')
      const integrity3 = computeDirectoryIntegrity(tmpDir)
      expect(integrity3.hash).not.toBe(integrity1.hash)
    })
  })

  describe('signature verification', () => {
    it('verifies signed directory contents successfully', () => {
      const keys = generateDeveloperKeys()
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("hello");')

      const sigData = signDirectory(tmpDir, keys.privateKey, keys.publicKey)
      fs.writeFileSync(path.join(tmpDir, 'signature.json'), JSON.stringify(sigData))

      const verification = verifyDirectoryIntegrity(tmpDir)
      expect(verification.success).toBe(true)
      expect(verification.publicKey).toBe(keys.publicKey)
    })

    it('fails verification if a file is tampered with', () => {
      const keys = generateDeveloperKeys()
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("hello");')

      const sigData = signDirectory(tmpDir, keys.privateKey, keys.publicKey)
      fs.writeFileSync(path.join(tmpDir, 'signature.json'), JSON.stringify(sigData))

      // Verify originally correct
      expect(verifyDirectoryIntegrity(tmpDir).success).toBe(true)

      // Tamper with main.js
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("tampered");')

      const verification = verifyDirectoryIntegrity(tmpDir)
      expect(verification.success).toBe(false)
      expect(verification.error).toContain('integrity mismatch')
    })
  })

  describe('trusted keys', () => {
    it('manages public keys trust store', () => {
      const keys = generateDeveloperKeys()
      expect(isKeyTrusted(keys.publicKey)).toBe(false)

      addTrustedKey(keys.publicKey)
      expect(isKeyTrusted(keys.publicKey)).toBe(true)
      expect(getTrustedKeys()).toContain(keys.publicKey.trim())
    })
  })

  describe('state cache with HMAC', () => {
    it('saves and loads state cache securely', () => {
      const cache = { 'com.nuxy.calc': 'hash123', 'com.nuxy.notes': 'hash456' }
      saveStateCache(cache)

      const loaded = loadStateCache()
      expect(loaded['com.nuxy.calc']).toBe('hash123')
      expect(loaded['com.nuxy.notes']).toBe('hash456')
    })
  })

  describe('revocation list checks', () => {
    it('detects revoked extensions and hashes', () => {
      const keys = generateDeveloperKeys()

      const blacklist = {
        revokedIds: ['bad-ext'],
        revokedHashes: ['bad-hash-xyz'],
        revokedKeys: [],
      }

      fs.writeFileSync(path.join(mockHome, 'revoked-extensions.json'), JSON.stringify(blacklist))

      expect(isRevoked('bad-ext', 'good-hash', keys.publicKey)).toBe(true)
      expect(isRevoked('good-ext', 'bad-hash-xyz', keys.publicKey)).toBe(true)
      expect(isRevoked('good-ext', 'good-hash', keys.publicKey)).toBe(false)
    })
  })

  describe('makeDirectoryReadOnly', () => {
    it('sets files to read-only mode', () => {
      const testFile = path.join(tmpDir, 'read-only.js')
      fs.writeFileSync(testFile, 'console.log()')

      makeDirectoryReadOnly(tmpDir)

      const stat = fs.statSync(testFile)
      // Check that write bit for user/group/others is cleared on Unix (mode & 0o222 === 0)
      if (process.platform !== 'win32') {
        expect(stat.mode & 0o222).toBe(0)
      }
    })
  })
})
