import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@nuxy/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@nuxy/ui': path.resolve(__dirname, '../packages/ui/src/index.tsx')
    }
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              input: {
                index: 'electron/main.ts',
                'worker/extension-host': 'electron/worker/extension-host.ts'
              },
              external: ['typescript']
            }
          }
        }
      },
      preload: {
        input: 'electron/preload.ts'
      },
      renderer: {}
    })
  ],
  base: './'
})
