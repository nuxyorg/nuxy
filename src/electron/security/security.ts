import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { CONFIG_DIR, SECURITY_DIR } from '../config/paths.js'
import { computeDirectoryIntegrity, sha256 } from './sign-tool.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Security')

const TRUSTED_KEYS_PATH = path.join(SECURITY_DIR, 'trusted-keys.json')
const STATE_CACHE_PATH = path.join(SECURITY_DIR, 'extensions-state.json')
const STATE_SECRET_PATH = path.join(SECURITY_DIR, 'state-secret.key')
const REVOCATION_LIST_PATH = path.join(SECURITY_DIR, 'revoked-extensions.json')
const README_PATH = path.join(SECURITY_DIR, 'READ_ME_IMPORTANT.md')

const REVOCATION_LIST_URL =
  'https://raw.githubusercontent.com/atagulalan/nuxy-assets/main/revoked-extensions.json'

const README_CONTENT = `# Nuxy Security Files — DO NOT DELETE OR MODIFY

This folder contains files for Nuxy's security infrastructure.
Deleting or modifying these files may break the extension verification process.

## Files

### state-secret.key
Cryptographic key used for HMAC signing. If deleted, extensions-state.json
becomes invalid and all extensions must be verified from scratch.
**Never share this file — it is unique to your device.**

### extensions-state.json
HMAC-signed cache of integrity hashes for verified extensions.
Safe to delete — it will be recreated; however, all extensions will be rescanned.

### trusted-keys.json
List of public keys for trusted extension publishers.
If modified, your own extensions may fail to load.

### revoked-extensions.json
Revocation list (blacklist) downloaded from GitHub. If deleted, it will be updated.
`

// Migrate legacy files from CONFIG_DIR root, then ensure SECURITY_DIR exists
try {
  const isNew = !fs.existsSync(SECURITY_DIR)
  fs.mkdirSync(SECURITY_DIR, { recursive: true })

  for (const file of [
    'trusted-keys.json',
    'extensions-state.json',
    'state-secret.key',
    'revoked-extensions.json',
  ]) {
    const oldPath = path.join(CONFIG_DIR, file)
    const newPath = path.join(SECURITY_DIR, file)
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      fs.renameSync(oldPath, newPath)
      log.info(`Migrated ${file} → security/${file}`)
    }
  }

  if (isNew || !fs.existsSync(README_PATH)) {
    fs.writeFileSync(README_PATH, README_CONTENT)
  }
} catch {}

/**
 * Loads trusted public keys.
 */
export function getTrustedKeys(): string[] {
  try {
    if (fs.existsSync(TRUSTED_KEYS_PATH)) {
      return JSON.parse(fs.readFileSync(TRUSTED_KEYS_PATH, 'utf8'))
    }
  } catch (err) {
    log.error('Failed to read trusted-keys.json:', err)
  }
  return []
}

/**
 * Checks if a public key is trusted.
 */
export function isKeyTrusted(publicKeyPem: string): boolean {
  const normKey = publicKeyPem.trim()
  return getTrustedKeys().some((k) => k.trim() === normKey)
}

/**
 * Adds a public key to the trusted keys list.
 */
export function addTrustedKey(publicKeyPem: string): void {
  try {
    const keys = getTrustedKeys()
    const normKey = publicKeyPem.trim()
    if (!keys.some((k) => k.trim() === normKey)) {
      keys.push(normKey)
      fs.writeFileSync(TRUSTED_KEYS_PATH, JSON.stringify(keys, null, 2))
      log.info('Successfully added new trusted publisher key.')
    }
  } catch (err) {
    log.error('Failed to save trusted public key:', err)
  }
}

/**
 * Clears the trusted keys list (useful for tests).
 */
export function clearTrustedKeys(): void {
  try {
    if (fs.existsSync(TRUSTED_KEYS_PATH)) {
      fs.unlinkSync(TRUSTED_KEYS_PATH)
    }
  } catch {}
}

/**
 * Retrieves or generates the state cache secret.
 */
function getStateSecret(): Buffer {
  try {
    if (fs.existsSync(STATE_SECRET_PATH)) {
      return fs.readFileSync(STATE_SECRET_PATH)
    }
    const secret = crypto.randomBytes(32)
    fs.writeFileSync(STATE_SECRET_PATH, secret)
    return secret
  } catch (err) {
    log.warn('Failed to persist state secret, using temporary in-memory secret:', err)
    return crypto.randomBytes(32)
  }
}

/**
 * Loads the extensions-state.json state cache and verifies its HMAC signature.
 * Returns a map of extensionId -> integrityHash.
 */
export function loadStateCache(): Record<string, string> {
  try {
    if (fs.existsSync(STATE_CACHE_PATH)) {
      const { data, hmac } = JSON.parse(fs.readFileSync(STATE_CACHE_PATH, 'utf8'))
      const secret = getStateSecret()
      const computedHmac = crypto.createHmac('sha256', secret).update(data).digest('hex')

      if (computedHmac === hmac) {
        return JSON.parse(data)
      } else {
        log.warn('extensions-state.json signature is invalid, discarding cache.')
      }
    }
  } catch (err) {
    log.error('Failed to load or parse extensions state cache:', err)
  }
  return {}
}

/**
 * Saves the state cache with an HMAC signature.
 */
export function saveStateCache(cache: Record<string, string>): void {
  try {
    const secret = getStateSecret()
    const data = JSON.stringify(cache)
    const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex')
    fs.writeFileSync(STATE_CACHE_PATH, JSON.stringify({ data, hmac }, null, 2))
  } catch (err) {
    log.error('Failed to save extensions state cache:', err)
  }
}

/**
 * Downloads the latest revocation list (blacklist) from GitHub.
 * Fails silently if offline or request times out.
 */
export async function updateRevocationList(): Promise<void> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(REVOCATION_LIST_URL, { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      fs.writeFileSync(REVOCATION_LIST_PATH, JSON.stringify(data, null, 2))
      log.info('Revocation list updated successfully.')
    }
  } catch (err) {
    log.silly('Could not update revocation list (offline or timeout):', err)
  }
}

/**
 * Checks if an extension, its integrity hash, or publisher key is blacklisted.
 */
export function isRevoked(
  extensionId: string,
  integrityHash: string,
  publicKeyPem: string
): boolean {
  try {
    if (fs.existsSync(REVOCATION_LIST_PATH)) {
      const blacklist = JSON.parse(fs.readFileSync(REVOCATION_LIST_PATH, 'utf8'))
      const keyHash = sha256(publicKeyPem.trim())

      const revokedIds = blacklist.revokedIds ?? []
      const revokedHashes = blacklist.revokedHashes ?? []
      const revokedKeys = blacklist.revokedKeys ?? []

      if (
        revokedIds.includes(extensionId) ||
        revokedHashes.includes(integrityHash) ||
        revokedKeys.includes(keyHash)
      ) {
        return true
      }
    }
  } catch (err) {
    log.error('Failed to check revocation list:', err)
  }
  return false
}

/**
 * Cryptographically verifies a signature with a public key and target hash.
 */
function verifySignature(signature: string, publicKey: string, integrityHash: string): boolean {
  try {
    const verify = crypto.createVerify('SHA256')
    verify.update(integrityHash)
    return verify.verify(publicKey, signature, 'hex')
  } catch {
    return false
  }
}

/**
 * Verifies directory integrity by checking files against signature.json.
 */
export function verifyDirectoryIntegrity(dir: string): {
  success: boolean
  error?: string
  publicKey?: string
  hash?: string
} {
  const sigPath = path.join(dir, 'signature.json')
  if (!fs.existsSync(sigPath)) {
    return { success: false, error: 'signature.json is missing.' }
  }

  try {
    const sigData = JSON.parse(fs.readFileSync(sigPath, 'utf8'))
    const { signature, publicKey, integrity } = sigData

    if (!signature || !publicKey || !integrity || !integrity.hash) {
      return { success: false, error: 'signature.json contains invalid signature payload.' }
    }

    // Recompute integrity hash (ignoring signature.json itself)
    const computed = computeDirectoryIntegrity(dir)
    if (computed.hash !== integrity.hash) {
      return { success: false, error: 'Directory files integrity mismatch.' }
    }

    // Check if individual files match the declared hash in files dictionary
    for (const file of Object.keys(computed.files)) {
      if (computed.files[file] !== integrity.files?.[file]) {
        return { success: false, error: `File hash mismatch: ${file}` }
      }
    }

    // Verify signature
    const isValid = verifySignature(signature, publicKey, integrity.hash)
    if (!isValid) {
      return { success: false, error: 'Cryptographic signature is invalid.' }
    }

    return { success: true, publicKey, hash: integrity.hash }
  } catch (err: any) {
    return { success: false, error: `Verification failed: ${err.message}` }
  }
}

/**
 * Recursively applies read-only permissions (read and execute only, no write) to a directory.
 */
export function makeDirectoryReadOnly(dir: string): void {
  function apply(target: string) {
    const stat = fs.lstatSync(target)
    if (stat.isSymbolicLink()) return

    // Apply read-only permissions:
    // Owner/Group/Others: Read (4) and Execute (1) = 5.
    // Directories need Execute to be traversed, files need Execute if they are scripts/executables.
    // We use 0o555 for both to keep it simple and robust.
    try {
      fs.chmodSync(target, 0o555)
    } catch {}

    if (stat.isDirectory()) {
      const items = fs.readdirSync(target)
      for (const item of items) {
        apply(path.join(target, item))
      }
    }
  }

  try {
    apply(dir)
  } catch (err) {
    log.error(`Failed to apply read-only permissions on ${dir}:`, err)
  }
}
