#!/usr/bin/env node
/**
 * Nuxy dev orchestrator — grouped startup, progress bars, no pnpm stream prefixes.
 *
 * Phases:
 *   1. UIKit      — initial ui-default build
 *   2. Extensions — package + install all extensions
 *   3. Desktop    — vite (electron) + ui-default watch
 */
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { banner, ok, fail, watch, pipeChildOutput } from './lib/dev-log.mjs'
import {
  getPaths,
  ensureExtensionDirs,
  packageAllExtensions,
  startExtensionWatcher,
  listExtensionDirs,
  groupExtensionsByCategory,
} from './lib/dev-extensions.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function run(cmd, args, { cwd = ROOT, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env },
    })

    if (!quiet) {
      child.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
      )
      return
    }

    let stderr = ''
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${cmd} exited ${code}`))
    })
  })
}

function spawnDev(cmd, args, { cwd, env = {} }) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  })

  const flushOut = pipeChildOutput(child.stdout, {})
  const flushErr = pipeChildOutput(child.stderr, { isStderr: true })

  child.on('exit', () => {
    flushOut()
    flushErr()
  })

  return child
}

async function buildUIKit() {
  try {
    await run('pnpm', ['exec', 'vite', 'build'], {
      cwd: path.join(ROOT, 'extensions/ui-default'),
      quiet: true,
    })
    ok('Built UI kit')
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

async function packageExtensions() {
  const paths = getPaths()
  ensureExtensionDirs(paths)

  const extDirs = listExtensionDirs(paths.extensionsDir)
  const failures = await packageAllExtensions(paths)

  if (failures.length === 0) {
    const pl = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`
    const counts = groupExtensionsByCategory(extDirs)
    if (counts.shell > 0) ok(pl(counts.shell, 'shell'))
    if (counts.tools > 0) ok(pl(counts.tools, 'tool'))
    if (counts.themes > 0) ok(pl(counts.themes, 'theme'))
    if (counts.icons > 0) ok(pl(counts.icons, 'icon pack'))
    if (counts.uikit > 0) ok(pl(counts.uikit, 'ui kit'))
    if (counts.helpers > 0) ok(pl(counts.helpers, 'helper'))
  } else {
    fail(`${failures.length} failed: ${failures.join(', ')}`)
  }

  startExtensionWatcher(paths)
}

function startDesktop() {
  watch('Watching for changes')

  const desktop = spawnDev('pnpm', ['exec', 'env', '-u', 'ELECTRON_RUN_AS_NODE', 'vite'], {
    cwd: path.join(ROOT, 'src'),
    env: { NUXY_EXTENSIONS_READY: '1' },
  })

  const uikit = spawnDev('pnpm', ['exec', 'vite', 'build', '--watch', '--mode', 'development'], {
    cwd: path.join(ROOT, 'extensions/ui-default'),
  })

  let shuttingDown = false
  const shutdown = () => {
    if (shuttingDown) return
    shuttingDown = true
    desktop.kill('SIGTERM')
    uikit.kill('SIGTERM')
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  desktop.on('exit', shutdown)
}

console.log('')
banner(`Nuxy ${version}`)
console.log('')

await buildUIKit()
await packageExtensions()
startDesktop()
