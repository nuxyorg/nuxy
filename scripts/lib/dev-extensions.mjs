import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { warn, createProgress, refreshing, refreshDone } from './dev-log.mjs'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const nxtBin = path.resolve(repoRoot, 'packages/nxt/bin/nxt.js')

const skipDirs = new Set(['node_modules', '.git', 'dist'])
const skipWatchFiles = new Set(['_backend.bundle.mjs', 'style.css'])

const EXT_LABELS = { 'ui-default': 'UIKit' }

function extLabel(folderName) {
  return EXT_LABELS[folderName] ?? folderName
}

export function getPaths() {
  const extensionsDir = path.resolve(repoRoot, 'extensions')
  const nuxyExtDir = path.join(os.homedir(), '.nxy', 'extensions')
  const extractedDir = path.join(os.homedir(), '.nxy', 'extracted')
  return { extensionsDir, nuxyExtDir, extractedDir, repoRoot }
}

export function ensureExtensionDirs({ extensionsDir, nuxyExtDir, extractedDir }) {
  if (fs.existsSync(nuxyExtDir) && fs.lstatSync(nuxyExtDir).isSymbolicLink()) {
    fs.unlinkSync(nuxyExtDir)
    warn('Removed legacy extensions symlink')
  }
  fs.mkdirSync(nuxyExtDir, { recursive: true })

  for (const name of fs.readdirSync(extensionsDir)) {
    const src = path.join(extensionsDir, name)
    if (fs.statSync(src).isFile() && /\.(ts|tsx|js|jsx)$/.test(name)) {
      fs.copyFileSync(src, path.join(nuxyExtDir, name))
      fs.mkdirSync(extractedDir, { recursive: true })
      fs.copyFileSync(src, path.join(extractedDir, name))
    }
  }
}

export function listExtensionDirs(extensionsDir) {
  return fs
    .readdirSync(extensionsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skipDirs.has(e.name))
    .map((e) => path.join(extensionsDir, e.name))
    .filter((d) => fs.existsSync(path.join(d, 'manifest.json')))
}

export function groupExtensionsByCategory(extDirs) {
  const counts = { tools: 0, shell: 0, themes: 0, icons: 0, uikit: 0, helpers: 0 }
  for (const extDir of extDirs) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'))
      const type = manifest.type
      if (type === 'tool' || type === 'provider' || type === 'orchestrator') {
        if (manifest.bootstrap) counts.shell++
        else counts.tools++
      } else if (type === 'theme') counts.themes++
      else if (type === 'iconpack') counts.icons++
      else if (type === 'uikit') counts.uikit++
      else if (type === 'helper') counts.helpers++
    } catch {
      /* skip unreadable manifests */
    }
  }
  return counts
}

async function packageAndInstall(extDir, { force = false } = {}) {
  const name = path.basename(extDir)
  const packageArgs = ['package', ...(force ? ['--force'] : [])]
  await execFileAsync('node', [nxtBin, ...packageArgs], { cwd: extDir })
  await execFileAsync('node', [nxtBin, 'install'], { cwd: extDir })
  return name
}

/** Package all extensions with a progress bar. Returns failed extension names. */
export async function packageAllExtensions(paths) {
  const extDirs = listExtensionDirs(paths.extensionsDir)
  const progress = createProgress('Packaging', extDirs.length)
  const failures = []

  progress.start()

  await Promise.all(
    extDirs.map(async (extDir) => {
      const name = path.basename(extDir)
      try {
        await packageAndInstall(extDir, { force: true })
        progress.tick()
      } catch {
        progress.tick()
        failures.push(name)
      }
    })
  )

  progress.clear()
  return failures
}

function watchDir(dir, cb) {
  try {
    fs.watch(dir, { recursive: false }, (_, filename) => {
      if (filename) cb(path.join(dir, filename))
    })
  } catch {
    /* dir may not exist */
  }

  try {
    for (const item of fs.readdirSync(dir)) {
      if (skipDirs.has(item)) continue
      const full = path.join(dir, item)
      if (fs.statSync(full).isDirectory()) watchDir(full, cb)
    }
  } catch {
    /* */
  }
}

/** Watch extensions/ and re-package on change. Logs one line per reload. */
export function startExtensionWatcher(paths) {
  const { extensionsDir } = paths
  const pendingDebounce = new Map()
  const quietUntil = Date.now() + 3000

  const getExtFolder = (filePath) => {
    const rel = path.relative(extensionsDir, filePath)
    const parts = rel.split(path.sep)
    return parts.length > 1 ? parts[0] : null
  }

  watchDir(extensionsDir, (filePath) => {
    if (filePath.includes(`${path.sep}dist${path.sep}`)) return
    const base = path.basename(filePath)
    if (skipWatchFiles.has(base)) return
    const folderName = getExtFolder(filePath)
    if (!folderName || skipDirs.has(folderName)) return
    // ui-default frontend.js is produced by the Vite watch — reinstall only after it lands
    if (folderName === 'ui-default' && base !== 'frontend.js') return
    const extDir = path.join(extensionsDir, folderName)
    if (!fs.existsSync(path.join(extDir, 'manifest.json'))) return

    const prev = pendingDebounce.get(folderName)
    if (prev) clearTimeout(prev)
    pendingDebounce.set(
      folderName,
      setTimeout(() => {
        pendingDebounce.delete(folderName)
        void (async () => {
          const label = extLabel(folderName)
          const quiet = Date.now() < quietUntil
          if (!quiet) refreshing(label)
          try {
            await packageAndInstall(extDir, { force: true })
            if (!quiet) refreshDone(label)
          } catch (err) {
            if (!quiet && process.stdout.isTTY) process.stdout.write('\r\x1b[2K')
            const msg = err instanceof Error ? err.message : String(err)
            process.stderr.write(`  ✘ ${folderName}: ${msg}\n`)
          }
        })()
      }, 500)
    )
  })
}
