import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config/paths.js'

const DISABLED_FILE = path.join(DATA_DIR, 'com.nuxy.settings', 'disabled-extensions.json')

export function readDisabledList(): Set<string> {
  try {
    const raw = fs.readFileSync(DISABLED_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set<string>(parsed)
  } catch {}
  return new Set<string>()
}

export function setExtensionEnabled(extId: string, enabled: boolean): void {
  const list = readDisabledList()
  if (enabled) {
    list.delete(extId)
  } else {
    list.add(extId)
  }
  const dir = path.dirname(DISABLED_FILE)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DISABLED_FILE, JSON.stringify([...list], null, 2), 'utf8')
}
