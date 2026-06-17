#!/usr/bin/env node
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const name = process.argv[2]

if (!name) {
  console.error('Usage: pnpm dev-ext <extension-name>')
  console.error('Example: pnpm dev-ext nyaa')
  console.error('\nAvailable extensions:')
  for (const entry of fs.readdirSync(path.resolve(__dirname, '../extensions'))) {
    const manifestPath = path.join(__dirname, '../extensions', entry, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      if (m.entry?.frontend) console.error(`  ${entry}`)
    }
  }
  process.exit(1)
}

const extPath = path.resolve(__dirname, '../extensions', name)
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

const devBin = path.resolve(__dirname, '../packages/ext-devserver/bin/dev.mjs')

const child = spawn(process.execPath, [devBin], {
  cwd: extPath,
  env: {
    ...process.env,
    NUXY_EXT_PATH: extPath,
    NUXY_EXT_NAME: manifest.entry.element?.replace(/^nuxy-tool-/, '') ?? name,
  },
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
