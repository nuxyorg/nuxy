import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot  = path.resolve(__dirname, '..')

/** Absolute path to the nxt CLI binary (repo-local, no global PATH dependency) */
const nxtBin = path.resolve(repoRoot, 'packages/nxt/bin/nxt.js')

const workspaceAliases = {
  '@nuxy/core':           path.resolve(repoRoot, 'packages/core/src/index.ts'),
  '@nuxy/ui':             path.resolve(repoRoot, 'packages/ui/src/index.tsx'),
  '@nuxy/extension-host': path.resolve(repoRoot, 'packages/extension-host/src/index.ts'),
  '@nuxy/extension-sdk':  path.resolve(repoRoot, 'packages/extension-sdk/src/index.ts'),
}

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  plugins: [
    {
      /**
       * nxt-extensions — replaces the old symlink-extensions plugin.
       *
       * On dev startup:
       *   1. Converts ~/.nuxy/extensions from a symlink (legacy) to a real directory.
       *   2. Runs `nxt package && nxt install` for every extension folder.
       *   3. Watches extensions/ for changes and re-packages on edit.
       *
       * No manual zipping, signing, or symlinking — `nxt` handles everything.
       */
      name: 'nxt-extensions',
      async configureServer(_server) {
        const extensionsDir = path.resolve(repoRoot, 'extensions')
        const nuxyExtDir    = path.join(os.homedir(), '.nuxy', 'extensions')
        const skipDirs      = new Set(['node_modules', '.git'])

        // ── 1. Ensure ~/.nuxy/extensions/ is a real directory ──────────────
        if (fs.existsSync(nuxyExtDir) && fs.lstatSync(nuxyExtDir).isSymbolicLink()) {
          fs.unlinkSync(nuxyExtDir)
          console.log('[nxt] Removed legacy extensions symlink → using real directory')
        }
        fs.mkdirSync(nuxyExtDir, { recursive: true })

        // Copy loose shared files (e.g. ui-hooks.ts) from extensions/ root directly.
        // These are shared modules imported by extension frontends; not packaged themselves.
        const extractedDir = path.join(os.homedir(), '.nuxy', 'extracted')
        for (const name of fs.readdirSync(extensionsDir)) {
          const src = path.join(extensionsDir, name)
          if (fs.statSync(src).isFile() && /\.(ts|tsx|js|jsx)$/.test(name)) {
            fs.copyFileSync(src, path.join(nuxyExtDir, name))
            fs.mkdirSync(extractedDir, { recursive: true })
            fs.copyFileSync(src, path.join(extractedDir, name))
          }
        }

        // ── 2. Package + install each extension (parallel) ────────────────
        const packageAndInstall = async (extDir: string): Promise<void> => {
          const name = path.basename(extDir)
          try {
            await execFileAsync('node', [nxtBin, 'package'], { cwd: extDir })
            await execFileAsync('node', [nxtBin, 'install'], { cwd: extDir })
            console.log(`[nxt] ✔ ${name}`)
          } catch (err: unknown) {
            const stderr = (err as { stderr?: string }).stderr ?? ''
            const msg = stderr.trim() || (err instanceof Error ? err.message : String(err))
            console.error(`[nxt] ✘ ${name}: ${msg.trim()}`)
          }
        }

        const extDirs = fs.readdirSync(extensionsDir, { withFileTypes: true })
          .filter(e => e.isDirectory() && !skipDirs.has(e.name))
          .map(e => path.join(extensionsDir, e.name))
          .filter(d => fs.existsSync(path.join(d, 'manifest.json')))

        await Promise.all(extDirs.map(packageAndInstall))

        console.log('[nxt] All extensions packaged and installed')

        // ── 3. Watch for file changes and re-package ──────────────────────
        const pendingDebounce = new Map<string, ReturnType<typeof setTimeout>>()

        const getExtFolder = (filePath: string): string | null => {
          const rel   = path.relative(extensionsDir, filePath)
          const parts = rel.split(path.sep)
          // Only respond to files inside a named extension subdirectory
          return parts.length > 1 ? parts[0] : null
        }

        const watchDir = (dir: string, cb: (fp: string) => void): void => {
          try {
            fs.watch(dir, { recursive: false }, (_, filename) => {
              if (filename) cb(path.join(dir, filename))
            })
          } catch { /* dir may not exist or be inaccessible */ }

          try {
            for (const item of fs.readdirSync(dir)) {
              if (skipDirs.has(item)) continue
              const full = path.join(dir, item)
              if (fs.statSync(full).isDirectory()) watchDir(full, cb)
            }
          } catch { /* */ }
        }

        watchDir(extensionsDir, (filePath) => {
          const folderName = getExtFolder(filePath)
          if (!folderName || skipDirs.has(folderName)) return
          const extDir = path.join(extensionsDir, folderName)
          if (!fs.existsSync(path.join(extDir, 'manifest.json'))) return

          // Debounce: wait 500 ms after the last change before re-packaging
          const prev = pendingDebounce.get(folderName)
          if (prev) clearTimeout(prev)
          pendingDebounce.set(
            folderName,
            setTimeout(() => {
              pendingDebounce.delete(folderName)
              void packageAndInstall(extDir)
            }, 500)
          )
        })
      },
    },
    electron({
      main: {
        entry: 'electron/bootstrap/main.ts',
        vite: {
          resolve: {
            alias: workspaceAliases,
          },
          build: {
            rollupOptions: {
              input: {
                index: 'electron/bootstrap/main.ts',
                'worker/extension-host': path.resolve(
                  repoRoot,
                  'packages/extension-host/src/index.ts'
                ),
              },
              external: ['typescript', 'dbus-next', 'electron', 'esbuild'],
            },
          },
        },
      },
      preload: {
        input: 'electron/bootstrap/preload.ts',
      },
    }),
  ],
  base: './',
})
