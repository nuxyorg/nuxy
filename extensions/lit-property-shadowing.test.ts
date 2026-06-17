/* cspell:ignore nyaa devserver */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SCAN_DIRS = [
  'extensions/ui-default/src',
  'extensions/shell',
  'extensions/notes',
  'extensions/nyaa',
  'extensions/settings',
  'packages/ext-template',
  'packages/ext-devserver/src',
]

const BAD_PROPERTY_RE = /@(?:property|state)\([^)]*\)\s+\w+\s*[=:]/
const BAD_PROPERTY_RE2 = /@(?:property|state)\([^)]*\)\s+(?:private|protected|public)\s+\w+\s*[=:]/

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) files.push(full)
  }
  return files
}

describe('Lit property class-field shadowing guard', () => {
  it('uses declare for @property and @state fields', () => {
    const violations: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of walk(path.join(root, dir))) {
        const content = fs.readFileSync(file, 'utf8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (trimmed.includes('declare ')) continue
          if (BAD_PROPERTY_RE.test(trimmed) || BAD_PROPERTY_RE2.test(trimmed)) {
            violations.push(`${path.relative(root, file)}: ${trimmed}`)
          }
        }
      }
    }

    expect(violations).toEqual([])
  })
})
