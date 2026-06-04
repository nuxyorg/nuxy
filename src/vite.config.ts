import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'
import AdmZip from 'adm-zip'

import { signDirectory, generateDeveloperKeys } from './electron/security/sign-tool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const workspaceAliases = {
  '@nuxy/core': path.resolve(repoRoot, 'packages/core/src/index.ts'),
  '@nuxy/ui': path.resolve(repoRoot, 'packages/ui/src/index.tsx'),
  '@nuxy/extension-host': path.resolve(repoRoot, 'packages/extension-host/src/index.ts'),
  '@nuxy/extension-sdk': path.resolve(repoRoot, 'packages/extension-sdk/src/index.ts'),
}

export default defineConfig({
  resolve: {
    alias: workspaceAliases,
  },
  plugins: [
    {
      name: 'symlink-extensions',
      configureServer(server) {
        const sourceDir = path.resolve(repoRoot, 'extensions')
        const targetDir = path.resolve(repoRoot, 'dist/extensions')
        const extDestDir = path.resolve(os.homedir(), '.nuxy/extensions')
        const skipDirs = new Set(['node_modules', '.git'])

        const keysPath = path.resolve(repoRoot, 'dist/developer-keys.json')
        let keys: { privateKey: string; publicKey: string }
        try {
          if (fs.existsSync(keysPath)) {
            keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'))
          } else {
            fs.mkdirSync(path.dirname(keysPath), { recursive: true })
            keys = generateDeveloperKeys()
            fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2))
          }
        } catch (e) {
          console.error('[symlink-extensions] Failed to load or generate developer keys:', e)
          keys = generateDeveloperKeys()
        }

        const shouldSync = (filePath: string) => {
          const parts = path.relative(sourceDir, filePath).split(path.sep)
          return !parts.some((part) => skipDirs.has(part))
        }

        const getExtensionId = (extDir: string, fallback: string): string => {
          try {
            const manifestPath = path.join(extDir, 'manifest.json')
            if (fs.existsSync(manifestPath)) {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
              return manifest.id || fallback
            }
          } catch {}
          return fallback
        }

        const zipExtension = (srcExtDir: string, destZipPath: string) => {
          const zip = new AdmZip()
          const addFiles = (dir: string, zipPath: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
              if (skipDirs.has(entry.name)) continue
              const fullPath = path.join(dir, entry.name)
              const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name
              if (entry.isDirectory()) {
                addFiles(fullPath, entryZipPath)
              } else if (entry.isFile()) {
                zip.addLocalFile(fullPath, zipPath)
              }
            }
          }
          addFiles(srcExtDir, '')

          try {
            const sigData = signDirectory(srcExtDir, keys.privateKey, keys.publicKey)
            zip.addFile('signature.json', Buffer.from(JSON.stringify(sigData, null, 2)))
          } catch (err) {
            console.error(`[symlink-extensions] Failed to sign extension at ${srcExtDir}:`, err)
          }

          zip.writeZip(destZipPath)
        }

        const syncAllExtensions = () => {
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true })
          }
          fs.mkdirSync(targetDir, { recursive: true })

          const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
          for (const entry of entries) {
            if (skipDirs.has(entry.name)) continue
            const srcExtDir = path.join(sourceDir, entry.name)
            if (entry.isDirectory()) {
              const extId = getExtensionId(srcExtDir, entry.name)
              const destZipPath = path.join(targetDir, `${extId}.nuxyext`)
              zipExtension(srcExtDir, destZipPath)
            }
          }
        }

        const getExtensionFolderFromPath = (filePath: string): string | null => {
          const relative = path.relative(sourceDir, filePath)
          const parts = relative.split(path.sep)
          return parts[0] || null
        }

        const watchRecursive = (
          dir: string,
          callback: (event: string, filepath: string) => void
        ) => {
          try {
            fs.watch(dir, { recursive: false }, (event, filename) => {
              if (filename) callback(event, path.join(dir, filename))
            })
          } catch (e) {
            console.error(`[symlink-extensions] Failed to watch ${dir}:`, e)
          }

          try {
            const items = fs.readdirSync(dir)
            for (const item of items) {
              const fullPath = path.join(dir, item)
              if (skipDirs.has(item)) continue
              if (fs.statSync(fullPath).isDirectory()) {
                watchRecursive(fullPath, callback)
              }
            }
          } catch (e) {}
        }

        try {
          syncAllExtensions()
          console.log(
            `[symlink-extensions] Packaged and synced extensions from ${sourceDir} -> ${targetDir}`
          )

          if (fs.existsSync(extDestDir)) {
            const stat = fs.lstatSync(extDestDir)
            if (stat.isSymbolicLink()) {
              const target = fs.readlinkSync(extDestDir)
              if (target === targetDir) {
                // Already correct symlink, but we still want to watch
              } else {
                fs.unlinkSync(extDestDir)
                fs.symlinkSync(targetDir, extDestDir, 'dir')
                console.log(`[symlink-extensions] Recreated symlink: ${extDestDir} -> ${targetDir}`)
              }
            } else {
              fs.rmSync(extDestDir, { recursive: true, force: true })
              fs.symlinkSync(targetDir, extDestDir, 'dir')
              console.log(
                `[symlink-extensions] Replaced dir with symlink: ${extDestDir} -> ${targetDir}`
              )
            }
          } else {
            fs.mkdirSync(path.dirname(extDestDir), { recursive: true })
            fs.symlinkSync(targetDir, extDestDir, 'dir')
            console.log(`[symlink-extensions] Created symlink: ${extDestDir} -> ${targetDir}`)
          }

          watchRecursive(sourceDir, (event, filepath) => {
            if (!shouldSync(filepath)) return
            const folderName = getExtensionFolderFromPath(filepath)
            if (!folderName) return

            const srcExtDir = path.join(sourceDir, folderName)
            if (!fs.existsSync(srcExtDir) || !fs.statSync(srcExtDir).isDirectory()) {
              syncAllExtensions()
              return
            }

            const extId = getExtensionId(srcExtDir, folderName)
            const destZipPath = path.join(targetDir, `${extId}.nuxyext`)
            try {
              zipExtension(srcExtDir, destZipPath)
              console.log(`[symlink-extensions] Packaged and updated: ${extId}.nuxyext`)
            } catch (err) {
              console.error(`[symlink-extensions] Failed to package ${extId}:`, err)
            }
          })
        } catch (e) {
          console.error('[symlink-extensions] Error during symlink and watch setup:', e)
        }
      },
    },
    react(),
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
