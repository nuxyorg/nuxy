#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

function convertProxyFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8')
  const before = src

  src = src.replace(/^import React(?:,?\s*\{[^}]*\})?\s+from 'react'\n/m, '')
  src = src.replace(/^import\s+\{[^}]+\}\s+from 'react'\n/m, '')
  src = src.replace(/^import type \* as React from 'react'\n/m, '')

  src = src.replace(/extends React\.\w+(<[^>]+>)?/g, 'extends Record<string, unknown>')
  src = src.replace(/React\.\w+(<[^>]+>)?/g, 'unknown')
  src = src.replace(/:\s*React\.ReactElement/g, ': unknown')
  src = src.replace(/:\s*ReactNode/g, ': unknown')

  // forwardRef exports → plain function delegating to window.UI
  src = src.replace(
    /export const (\w+) = forwardRef<[^>]+,\s*([^>]+)>\(\([^)]*\)[^{]*\{[\s\S]*?const Impl = \(window\.UI as any\)\?\.(\w+)[\s\S]*?return <Impl[^>]*\/>[\s\S]*?\}\)[\s\S]*?\1\.displayName = '\1'/g,
    "export function $1(...args: any[]): unknown {\n  return (window.UI as any)?.$3?.(...args) ?? null\n}"
  )

  // Standard proxy component
  src = src.replace(
    /export function (\w+)\([^)]*\):\s*(?:React\.ReactElement|unknown)[^{]*\{[\s\S]*?const Impl = \(window\.UI as any\)\?\.(\w+)\s*\|\|\s*\(\(\)\s*=>\s*null\)[\s\S]*?return <Impl[^>]*\/>[\s\S]*?\}/g,
    "export function $1(...args: any[]): unknown {\n  return (window.UI as any)?.$2?.(...args) ?? null\n}"
  )

  // Hook proxies — remove react imports, keep delegate body
  src = src.replace(
    /export function (use\w+)\([^)]*\):\s*any \{[\s\S]*?return \(window\.UI as any\)\?\.(\1)[\s\S]*?\}/g,
    (match, name) => {
      if (!match.includes('window.UI')) return match
      return `export function ${name}(...args: any[]): unknown {\n  return (window.UI as any)?.${name}?.(...args)\n}`
    }
  )

  if (src !== before) fs.writeFileSync(filePath, src)
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) convertProxyFile(p)
  }
}

walk(root)
console.log('De-Reacted packages/ui proxies')
