import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export interface KeyPair {
  privateKey: string
  publicKey: string
}

export interface SignatureData {
  signature: string
  publicKey: string
  integrity: {
    hash: string
    files: Record<string, string>
  }
}

/**
 * Generates an RSA key pair for self-signing extensions.
 */
export function generateDeveloperKeys(): KeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  return { privateKey, publicKey }
}

/**
 * Computes SHA-256 hash of a buffer.
 */
export function sha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Deterministically scans a directory, calculates file hashes, and computes an aggregate integrity hash.
 */
export function computeDirectoryIntegrity(srcDir: string): {
  hash: string
  files: Record<string, string>
} {
  const filesMap: Record<string, string> = {}
  const skipNames = new Set(['signature.json', 'node_modules', '.git'])

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (skipNames.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        const relativePath = path.relative(srcDir, fullPath).replace(/\\/g, '/')
        const fileContent = fs.readFileSync(fullPath)
        filesMap[relativePath] = sha256(fileContent)
      }
    }
  }

  walk(srcDir)

  // Deterministically sort paths to guarantee same aggregate hash
  const sortedPaths = Object.keys(filesMap).sort()
  const hashList = sortedPaths.map((p) => `${p}:${filesMap[p]}`).join('\n')
  const aggregateHash = sha256(hashList)

  return {
    hash: aggregateHash,
    files: filesMap,
  }
}

/**
 * Signs the integrity hash of a directory using a private key.
 * Returns the SignatureData structure ready to be written to signature.json.
 */
export function signDirectory(
  srcDir: string,
  privateKeyPem: string,
  publicKeyPem: string
): SignatureData {
  const integrity = computeDirectoryIntegrity(srcDir)
  const sign = crypto.createSign('SHA256')
  sign.update(integrity.hash)
  const signature = sign.sign(privateKeyPem, 'hex')

  return {
    signature,
    publicKey: publicKeyPem,
    integrity,
  }
}
