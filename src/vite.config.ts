import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'

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
        const extSrcDir = path.resolve(repoRoot, 'extensions')
        const extDestDir = path.resolve(os.homedir(), '.nuxy/extensions')

        try {
          if (fs.existsSync(extDestDir)) {
            const stat = fs.lstatSync(extDestDir)
            if (stat.isSymbolicLink()) {
              const target = fs.readlinkSync(extDestDir)
              if (target === extSrcDir) {
                return // Already correct symlink
              }
              fs.unlinkSync(extDestDir)
            } else {
              fs.rmSync(extDestDir, { recursive: true, force: true })
            }
          } else {
            fs.mkdirSync(path.dirname(extDestDir), { recursive: true })
          }

          fs.symlinkSync(extSrcDir, extDestDir, 'dir')
          console.log(`[symlink-extensions] Created symlink: ${extDestDir} -> ${extSrcDir}`)
        } catch (e) {
          console.error('[symlink-extensions] Error creating symlink:', e)
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
              external: ['typescript', 'dbus-next', 'electron'],
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
