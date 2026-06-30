import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'electron/**/*.test.ts',
      '../extensions/**/*.test.js',
      '../extensions/**/*.test.ts',
      '../packages/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '../**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@nuxyorg/core/runtime-export-names': path.resolve(
        __dirname,
        '../packages/core/src/runtime-export-names.ts'
      ),
      '@nuxyorg/extension-sdk/runtime-export-names': path.resolve(
        __dirname,
        '../packages/extension-sdk/src/runtime-export-names.ts'
      ),
      '@nuxyorg/core': path.resolve(__dirname, '../packages/core/src/renderer.ts'),
    },
  },
})
