import fs from 'fs'
import path from 'path'
import os from 'os'

const repoRoot = path.resolve(import.meta.dirname, '..')
const sourceDir = path.resolve(repoRoot, 'extensions')
const targetDir = path.resolve(repoRoot, 'dist/extensions')
const extDestDir = path.resolve(os.homedir(), '.nuxy/extensions')
const skipDirs = new Set(['node_modules', '.git'])

console.log('sourceDir:', sourceDir)
console.log('targetDir:', targetDir)
console.log('extDestDir:', extDestDir)

// 1. Check if extDestDir is a symlink and what it resolves to
try {
  const stat = fs.lstatSync(extDestDir)
  console.log('extDestDir exists, isSymbolicLink:', stat.isSymbolicLink())
  if (stat.isSymbolicLink()) {
    console.log('extDestDir link target:', fs.readlinkSync(extDestDir))
  }
} catch (e) {
  console.log('extDestDir check error:', e.message)
}

// 2. Watcher like vite.config.ts
const watchRecursiveVite = (dir, callback) => {
  try {
    fs.watch(dir, { recursive: false }, (event, filename) => {
      if (filename) callback(event, path.join(dir, filename))
    })
  } catch (e) {
    console.error(`[Vite Watcher] Failed to watch ${dir}:`, e.message)
  }

  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      if (skipDirs.has(item)) continue
      if (fs.statSync(fullPath).isDirectory()) {
        watchRecursiveVite(fullPath, callback)
      }
    }
  } catch {}
}

watchRecursiveVite(sourceDir, (event, filepath) => {
  console.log(`[Vite Watch Event] ${event} on ${filepath}`)
})

// 3. Watcher like scanner.ts (resolved)
let resolvedDir = extDestDir
try {
  resolvedDir = fs.realpathSync(extDestDir)
} catch (err) {
  console.log('Failed to resolve realpath of extDestDir:', err.message)
}

console.log('Resolved dir for scanner watch:', resolvedDir)

const watchRecursiveScanner = (dir) => {
  try {
    fs.watch(dir, { recursive: false }, (event, filename) => {
      console.log(`[Scanner Watch Event] ${event} on file in ${dir} (filename: ${filename})`)
    })
  } catch (err) {
    console.error(`[Scanner Watcher] Failed to watch ${dir}:`, err.message)
  }

  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      if (skipDirs.has(item)) continue
      const fullPath = path.join(dir, item)
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        watchRecursiveScanner(fullPath)
      }
    }
  } catch {}
}

watchRecursiveScanner(resolvedDir)

console.log('Watching... Try editing extensions/angrysearch/frontend.tsx and press Ctrl+C to exit.')
