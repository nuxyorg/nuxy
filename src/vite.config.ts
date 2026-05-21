import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'

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
