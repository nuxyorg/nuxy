#!/usr/bin/env node
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const extPath = path.resolve(process.env.NUXY_EXT_PATH ?? process.cwd())
const manifestPath = path.join(extPath, 'manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error('No manifest.json found.')
  console.error('Run this command from your extension root, or set NUXY_EXT_PATH.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

if (!manifest.entry?.frontend) {
  console.error(`Extension "${manifest.id ?? path.basename(extPath)}" has no frontend entry.`)
  process.exit(1)
}

const element = manifest.entry.element ?? `nuxy-tool-${path.basename(extPath)}`
const extName = element.replace(/^nuxy-tool-/, '')

const devserverRoot = path.resolve(__dirname, '..')
const viteConfig = path.join(devserverRoot, 'vite.config.ts')
const vitePkg = require.resolve('vite/package.json', { paths: [devserverRoot] })
const viteBin = path.join(path.dirname(vitePkg), 'bin', 'vite.js')

console.log('\n  Nuxy Extension Dev Server')
console.log(`  Extension : ${manifest.name} (${manifest.id})`)
console.log(`  Path      : ${extPath}`)
console.log(`  URL       : http://localhost:5174\n`)

const child = spawn(process.execPath, [viteBin, '--config', viteConfig], {
  cwd: devserverRoot,
  env: {
    ...process.env,
    NUXY_EXT_PATH: extPath,
    NUXY_EXT_NAME: extName,
  },
  stdio: 'inherit',
})

child.on('exit', (code) => process.exit(code ?? 0))
