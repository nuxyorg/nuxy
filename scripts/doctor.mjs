#!/usr/bin/env node
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXTENSIONS_DIR = path.resolve(ROOT, 'extensions')

// Named non-extension targets
const NAMED_TARGETS = {
  ui: path.resolve(ROOT, 'packages/ui'),
  'ui-default': path.resolve(ROOT, 'extensions/ui-default'),
  'nuxy-desktop': path.resolve(ROOT, 'src'),
  src: path.resolve(ROOT, 'src'),
}

const name = process.argv[2]

function runDoctor(targetDir, extra = []) {
  const args = ['dlx', 'react-doctor@latest', '--no-telemetry', ...extra, targetDir]
  const proc = spawn('pnpm', args, { cwd: ROOT, stdio: 'inherit' })
  proc.on('exit', (code) => process.exit(code ?? 0))
}

function listExtensions() {
  return fs
    .readdirSync(EXTENSIONS_DIR)
    .filter((e) => fs.existsSync(path.join(EXTENSIONS_DIR, e, 'manifest.json')))
}

if (!name) {
  console.log('\n  Nuxy Doctor — Full Workspace Scan\n')
  runDoctor('.', ['--yes'])
} else if (NAMED_TARGETS[name]) {
  console.log(`\n  Nuxy Doctor — ${name}\n`)
  runDoctor(NAMED_TARGETS[name])
} else {
  const extPath = path.join(EXTENSIONS_DIR, name)

  if (!fs.existsSync(path.join(extPath, 'manifest.json'))) {
    console.error(`\n  Unknown target: "${name}"`)
    console.error('\n  Named targets: ui, ui-default, nuxy-desktop')
    console.error('\n  Available extensions:')
    for (const ext of listExtensions()) console.error(`    ${ext}`)
    console.error()
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(extPath, 'manifest.json'), 'utf8'))
  console.log(`\n  Nuxy Doctor — ${manifest.name} (${manifest.id})\n`)
  runDoctor(extPath)
}
