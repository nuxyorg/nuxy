import fs from 'fs'
import path from 'path'

/** Vite builds `preload.js`; older trees may still ship `preload.mjs`. */
export function resolvePreloadScriptPath(appPath: string): string {
  const dir = path.join(appPath, 'dist-electron')
  const candidates = ['preload.js', 'preload.mjs']
  for (const name of candidates) {
    const candidate = path.join(dir, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(dir, 'preload.js')
}
