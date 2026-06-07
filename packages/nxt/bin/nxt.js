#!/usr/bin/env node
/**
 * nxt — Nuxy Extension Tooling
 *
 * Commands:
 *   nxt package            Bundle backend + sign → .nuxyext file
 *   nxt install            Copy .nuxyext to ~/.nuxy/extensions/ (local dev / CI)
 *   nxt keys               Generate a new RSA developer key pair
 *   nxt info               Show manifest details
 *   nxt publish            (stub) Publish to the Nuxy registry
 */

import { createRequire } from 'module'
import { builtinModules } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')
const { Command } = require('commander')
const pc = require('picocolors')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Logging ──────────────────────────────────────────────────────────────────

function ok(msg)   { console.log(`${pc.green('✔')} ${msg}`) }
function info(msg) { console.log(`${pc.cyan('ℹ')} ${msg}`) }
function warn(msg) { console.log(`${pc.yellow('⚠')} ${msg}`) }
function fail(msg) { console.error(`${pc.red('✘')} ${msg}`); process.exit(1) }

// ─── Built-in modules blocklist ───────────────────────────────────────────────

const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
])

// ─── Crypto / signing helpers ─────────────────────────────────────────────────

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function computeDirectoryIntegrity(srcDir) {
  const skip = new Set(['signature.json', 'node_modules', '.git'])
  const filesMap = {}

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        const rel = path.relative(srcDir, full).replace(/\\/g, '/')
        filesMap[rel] = sha256(fs.readFileSync(full))
      }
    }
  }

  walk(srcDir)

  const sorted = Object.keys(filesMap).sort()
  const hashList = sorted.map((p) => `${p}:${filesMap[p]}`).join('\n')
  return { hash: sha256(hashList), files: filesMap }
}

function signDirectory(srcDir, privateKeyPem, publicKeyPem) {
  const integrity = computeDirectoryIntegrity(srcDir)
  const sign = crypto.createSign('SHA256')
  sign.update(integrity.hash)
  const signature = sign.sign(privateKeyPem, 'hex')
  return { signature, publicKey: publicKeyPem, integrity }
}

// ─── Key management ───────────────────────────────────────────────────────────

function loadOrCreateKeys(keysPath, generate = false) {
  if (!generate && fs.existsSync(keysPath)) {
    const raw = JSON.parse(fs.readFileSync(keysPath, 'utf8'))
    if (raw.privateKey && raw.publicKey) return raw
  }
  info('Generating new developer key pair…')
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const keys = { privateKey, publicKey }
  fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2), 'utf8')
  ok(`Keys written to ${keysPath}`)
  return keys
}

// ─── Repo root detection ──────────────────────────────────────────────────────

/**
 * Walk up from `start` looking for a pnpm-workspace.yaml.
 * Returns the monorepo root when found, null when not in a workspace.
 */
function findRepoRoot(start) {
  let dir = path.resolve(start)
  const { root } = path.parse(dir)
  while (dir !== root) {
    if (
      fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) ||
      fs.existsSync(path.join(dir, 'lerna.json'))
    ) {
      return dir
    }
    dir = path.dirname(dir)
  }
  return null
}

// ─── Backend bundling ─────────────────────────────────────────────────────────

/**
 * esbuild-bundle the extension backend into a single self-contained .mjs.
 * - Resolves npm deps from the extension's own node_modules
 * - Aliases @nuxy/* workspace packages to their TS source (monorepo mode)
 * - Node built-ins and electron are kept external
 * Returns the output path on success, null on skip / error.
 */
async function bundleBackend(cwd, manifest) {
  if (!manifest.entry?.backend) return null

  // Lazy-load esbuild so nxt works even without it installed (e.g. info/install)
  let esbuild
  try {
    esbuild = (await import('esbuild')).default ?? (await import('esbuild'))
  } catch {
    warn('esbuild not available — skipping backend bundling. Run: npm install -g @nuxy/nxt')
    return null
  }

  const entryPath = path.join(cwd, manifest.entry.backend)
  if (!fs.existsSync(entryPath)) {
    warn(`Backend entry not found: ${manifest.entry.backend}`)
    return null
  }

  // Resolve monorepo workspace package aliases
  const repoRoot = findRepoRoot(cwd)
  const alias = {}
  if (repoRoot) {
    const map = {
      '@nuxy/extension-sdk': path.join(repoRoot, 'packages/extension-sdk/src/index.ts'),
      '@nuxy/core':          path.join(repoRoot, 'packages/core/src/index.ts'),
    }
    for (const [name, src] of Object.entries(map)) {
      if (fs.existsSync(src)) alias[name] = src
    }
  }

  const bundleOut = path.join(cwd, '_backend.bundle.mjs')

  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundleOut,
    // electron is injected by the host; Node built-ins are blocked by the scanner gate
    external: ['electron', ...BUILTINS],
    absWorkingDir: cwd,
    logLevel: 'warning',
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
    ...(Object.keys(alias).length > 0 ? { alias } : {}),
  })

  return bundleOut
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_DIRS  = new Set(['node_modules', '.git'])
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db'])
const NUXY_EXT_DIR = path.join(os.homedir(), '.nuxy', 'extensions')

// ─── CLI ──────────────────────────────────────────────────────────────────────

const program = new Command()
program
  .name('nxt')
  .description('Nuxy Extension Tooling — package, install, and publish .nuxyext extensions')
  .version('0.1.0')

// ── nxt package ──────────────────────────────────────────────────────────────
program
  .command('package')
  .description('Bundle and sign the current extension into a .nuxyext file')
  .option('--keys <path>', 'Path to developer keys JSON', '.nxt-keys.json')
  .option('--out <dir>',   'Output directory for the .nuxyext file', '.')
  .option('--no-sign',     'Skip code signing (not recommended for distribution)')
  .action(async (opts) => {
    const cwd = process.cwd()

    // 1. Read manifest
    const manifestPath = path.join(cwd, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      fail('No manifest.json found. Are you inside an extension directory?')
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const extId   = manifest.id || path.basename(cwd)
    const version = manifest.version || '1.0.0'

    info(`Packaging extension: ${pc.bold(extId)} v${version}`)

    // 2. Bundle the backend (always — converts TS and inlines deps)
    let bundlePath = null
    if (manifest.entry?.backend) {
      info('Bundling backend…')
      try {
        bundlePath = await bundleBackend(cwd, manifest)
        if (bundlePath) ok('Backend bundled')
      } catch (err) {
        warn(`Backend bundling failed: ${err.message}`)
        bundlePath = null
      }
    }

    // 3. Load/generate signing keys
    let keys = null
    if (opts.sign !== false) {
      // Key discovery order: --keys flag → repo dist/developer-keys.json → .nxt-keys.json (auto-generate)
      const flagPath    = path.isAbsolute(opts.keys) ? opts.keys : path.join(cwd, opts.keys)
      const repoRoot    = findRepoRoot(cwd)
      const repoKeysPath = repoRoot ? path.join(repoRoot, 'dist', 'developer-keys.json') : null

      if (opts.keys !== '.nxt-keys.json' && fs.existsSync(flagPath)) {
        keys = JSON.parse(fs.readFileSync(flagPath, 'utf8'))
        info(`Using keys from ${flagPath}`)
      } else if (repoKeysPath && fs.existsSync(repoKeysPath)) {
        keys = JSON.parse(fs.readFileSync(repoKeysPath, 'utf8'))
        info(`Using repo developer keys from ${repoKeysPath}`)
      } else {
        keys = loadOrCreateKeys(flagPath)
      }
    }

    // 4. Build the zip (exclude node_modules / .git / temp bundle artifact)
    const zip = new AdmZip()

    function addDir(dir, zipBase) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name))  continue
        if (SKIP_FILES.has(entry.name)) continue
        if (entry.name === '_backend.bundle.mjs') continue  // added explicitly below
        const full     = path.join(dir, entry.name)
        const zipEntry = zipBase ? `${zipBase}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          addDir(full, zipEntry)
        } else if (entry.isFile()) {
          zip.addLocalFile(full, zipBase || '')
        }
      }
    }

    addDir(cwd, '')

    // Add the pre-bundled backend if available
    if (bundlePath && fs.existsSync(bundlePath)) {
      zip.addLocalFile(bundlePath, '')
    }

    // 5. Sign (before cleaning up bundle so _backend.bundle.mjs is included in the hash)
    if (keys) {
      info('Signing…')
      try {
        const sigData = signDirectory(cwd, keys.privateKey, keys.publicKey)
        zip.addFile('signature.json', Buffer.from(JSON.stringify(sigData, null, 2)))
        ok('Signed with developer key')
      } catch (err) {
        warn(`Signing failed: ${err.message}`)
      }
    }

    // Clean up temp bundle artifact after signing
    if (bundlePath && fs.existsSync(bundlePath)) {
      fs.rmSync(bundlePath, { force: true })
    } else {
      warn('Skipping code signing — extension will require manual trust on first install.')
    }

    // 6. Write output
    const outDir  = path.resolve(cwd, opts.out)
    fs.mkdirSync(outDir, { recursive: true })
    const outFile = path.join(outDir, `${extId}.nuxyext`)
    zip.writeZip(outFile)

    const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1)
    ok(`Packaged: ${pc.bold(outFile)} (${sizeKb} kB)`)
    info(`Install with: ${pc.bold('nxt install')}`)
  })

// ── nxt install ──────────────────────────────────────────────────────────────
program
  .command('install')
  .description('Install the packaged .nuxyext into ~/.nuxy/extensions/')
  .option('--file <path>', 'Explicit path to a .nuxyext file (auto-detected if omitted)')
  .action((opts) => {
    const cwd = process.cwd()

    // Find the .nuxyext file
    let nuxyextPath = opts.file
    if (!nuxyextPath) {
      const manifestPath = path.join(cwd, 'manifest.json')
      if (!fs.existsSync(manifestPath)) {
        fail('No manifest.json found and --file not specified.')
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const extId = manifest.id || path.basename(cwd)
      nuxyextPath = path.join(cwd, `${extId}.nuxyext`)
    }

    if (!fs.existsSync(nuxyextPath)) {
      fail(`Extension file not found: ${nuxyextPath}\nRun ${pc.bold('nxt package')} first.`)
    }

    // Ensure ~/.nuxy/extensions/ is a real directory (not a symlink from old dev setup)
    if (fs.existsSync(NUXY_EXT_DIR)) {
      if (fs.lstatSync(NUXY_EXT_DIR).isSymbolicLink()) {
        fs.unlinkSync(NUXY_EXT_DIR)
        fs.mkdirSync(NUXY_EXT_DIR, { recursive: true })
      }
    } else {
      fs.mkdirSync(NUXY_EXT_DIR, { recursive: true })
    }

    const dest = path.join(NUXY_EXT_DIR, path.basename(nuxyextPath))
    fs.copyFileSync(nuxyextPath, dest)

    ok(`Installed → ${pc.bold(dest)}`)
    info('Nuxy will hot-reload the extension automatically.')
  })

// ── nxt keys ─────────────────────────────────────────────────────────────────
program
  .command('keys')
  .description('Generate a new RSA developer key pair')
  .option('--out <path>', 'Output path for the keys JSON', '.nxt-keys.json')
  .action((opts) => {
    const keysPath = path.isAbsolute(opts.out)
      ? opts.out
      : path.join(process.cwd(), opts.out)
    loadOrCreateKeys(keysPath, true)
  })

// ── nxt info ─────────────────────────────────────────────────────────────────
program
  .command('info')
  .description('Show information about the current extension')
  .action(() => {
    const cwd = process.cwd()
    const manifestPath = path.join(cwd, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      fail('No manifest.json found. Are you inside an extension directory?')
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const pkgPath  = path.join(cwd, 'package.json')
    const pkg      = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {}

    console.log()
    console.log(`  ${pc.bold('Extension:')}   ${manifest.name || manifest.id}`)
    console.log(`  ${pc.bold('ID:')}          ${manifest.id}`)
    console.log(`  ${pc.bold('Version:')}     ${manifest.version}`)
    console.log(`  ${pc.bold('Type:')}        ${manifest.type}`)
    console.log(`  ${pc.bold('Permissions:')} ${(manifest.permissions || []).join(', ') || '(none)'}`)
    if (pkg.dependencies) {
      const deps = Object.keys(pkg.dependencies)
      console.log(`  ${pc.bold('Deps:')}        ${deps.join(', ')}`)
    }
    const repoRoot = findRepoRoot(cwd)
    if (repoRoot) {
      console.log(`  ${pc.bold('Workspace:')}   ${repoRoot}`)
    }
    console.log()
  })

// ── nxt publish ──────────────────────────────────────────────────────────────
program
  .command('publish')
  .description('Publish to the Nuxy extension registry (coming soon)')
  .action(() => {
    warn('nxt publish is not yet implemented.')
    info('Use nxt install for local installation.')
  })

program.parse()
