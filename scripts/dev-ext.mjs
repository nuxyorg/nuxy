#!/usr/bin/env node
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTENSIONS_DIR = path.resolve(__dirname, '../extensions')
const DEV_SERVER_DIR = path.resolve(__dirname, '../packages/ext-devserver')

const name = process.argv[2]

if (!name) {
  console.error('Usage: pnpm dev-ext <extension-name>')
  console.error('Example: pnpm dev-ext clipboard')
  console.error('\nAvailable extensions:')
  for (const entry of fs.readdirSync(EXTENSIONS_DIR)) {
    const manifestPath = path.join(EXTENSIONS_DIR, entry, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      if (m.entry?.frontend) console.error(`  ${entry}`)
    }
  }
  process.exit(1)
}

const extPath = path.join(EXTENSIONS_DIR, name)
const manifestPath = path.join(extPath, 'manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error(`Extension "${name}" not found.`)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (!manifest.entry?.frontend) {
  console.error(`Extension "${name}" has no frontend entry — nothing to preview.`)
  process.exit(1)
}

console.log(`\n  Nuxy Extension Dev Server`)
console.log(`  Extension : ${manifest.name} (${manifest.id})`)
console.log(`  Frontend  : ${path.join(extPath, manifest.entry.frontend)}`)
console.log(`  URL       : http://localhost:5174\n`)

const vite = spawn('pnpm', ['vite'], {
  cwd: DEV_SERVER_DIR,
  env: {
    ...process.env,
    NUXY_EXT_PATH: extPath,
    NUXY_EXT_NAME: manifest.name,
  },
  stdio: 'inherit',
})

vite.on('exit', (code) => process.exit(code ?? 0))
