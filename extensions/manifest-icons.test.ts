import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extensionsDir = path.resolve(root, 'extensions')

describe('manifest icon references resolve in icons-default', () => {
  it('every manifest.json "icon" exists in icons-default/icons.json', () => {
    const iconsJsonPath = path.join(extensionsDir, 'icons-default/icons.json')
    const pack = JSON.parse(fs.readFileSync(iconsJsonPath, 'utf8')) as { icons: string[] }
    const knownIcons = new Set(pack.icons)

    const missing: string[] = []
    for (const folder of fs.readdirSync(extensionsDir, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue
      const manifestPath = path.join(extensionsDir, folder.name, 'manifest.json')
      if (!fs.existsSync(manifestPath)) continue
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { icon?: string }
      if (manifest.icon && !knownIcons.has(manifest.icon)) {
        missing.push(`${folder.name}: icon "${manifest.icon}" not found in icons-default`)
      }
    }

    expect(missing).toEqual([])
  })
})
