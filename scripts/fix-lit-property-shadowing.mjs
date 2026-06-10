#!/usr/bin/env node
/**
 * Convert Lit @property / @state class field initializers to `declare` fields
 * to avoid class-field shadowing (https://lit.dev/msg/class-field-shadowing).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const TARGET_DIRS = [
  path.join(root, 'extensions/ui-default/src'),
  path.join(root, 'extensions/shell'),
  path.join(root, 'extensions/notes'),
  path.join(root, 'extensions/nyaa'),
  path.join(root, 'extensions/settings'),
  path.join(root, 'packages/ext-template'),
  path.join(root, 'packages/ext-devserver/src'),
]

function inferType(defaultValue, existingType) {
  if (existingType) return existingType.trim()
  const val = defaultValue.trim()
  if (val === 'true' || val === 'false') return 'boolean'
  if (/^-?\d+(\.\d+)?$/.test(val)) return 'number'
  if (
    (val.startsWith("'") && val.endsWith("'")) ||
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith('`') && val.endsWith('`'))
  ) {
    return 'string'
  }
  if (val === 'null') return 'null'
  if (val === '[]' || val.startsWith('[')) return 'unknown[]'
  return 'unknown'
}

const PROPERTY_RE =
  /^(\s*)(@(?:property|state)\(([\s\S]*?)\))\s+((?:private|protected|public)\s+)?(\w+)(?:\s*:\s*([^=\n]+?))?\s*=\s*([^\n]+)$/gm

function transformContent(content) {
  let changed = 0
  const next = content.replace(
    PROPERTY_RE,
    (_match, indent, decorator, _decoratorArgs, visibility, name, existingType, defaultValue) => {
      const type = inferType(defaultValue, existingType)
      const vis = visibility ? visibility.trim() + ' ' : ''
      changed++
      return `${indent}${decorator}\n${indent}${vis}declare ${name}: ${type}`
    }
  )
  return { content: next, changed }
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full)
  }
  return files
}

let totalFiles = 0
let totalChanges = 0

for (const dir of TARGET_DIRS) {
  for (const file of walk(dir)) {
    const original = fs.readFileSync(file, 'utf8')
    const { content, changed } = transformContent(original)
    if (changed > 0) {
      fs.writeFileSync(file, content)
      totalFiles++
      totalChanges += changed
      console.log(`${path.relative(root, file)}: ${changed}`)
    }
  }
}

console.log(`\nDone: ${totalChanges} properties in ${totalFiles} files`)
