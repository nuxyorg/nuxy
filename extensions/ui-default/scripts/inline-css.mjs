#!/usr/bin/env node
// Post-build script: inlines style.css into frontend.js.
// Vite lib mode writes CSS separately; nuxy-ext:// protocol can only serve
// a single file, so we merge them here.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsPath = path.join(__dirname, '..', 'frontend.js')
const cssPath = path.join(__dirname, '..', 'style.css')

if (!fs.existsSync(cssPath)) {
  console.log('[inline-css] No style.css found — nothing to inline.')
  process.exit(0)
}
if (!fs.existsSync(jsPath)) {
  console.error('[inline-css] frontend.js not found — did the build run?')
  process.exit(1)
}

const css = fs.readFileSync(cssPath, 'utf8')
const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
const injection =
  `;(function(){` +
  `var s=document.createElement('style');` +
  `s.textContent=\`${escaped}\`;` +
  `document.head.appendChild(s);` +
  `})()\n`

fs.appendFileSync(jsPath, injection, 'utf8')
fs.unlinkSync(cssPath)

console.log(`[inline-css] Inlined ${css.length} bytes of CSS into frontend.js`)
