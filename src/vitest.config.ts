import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
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
      '@nuxyorg/core': path.resolve(__dirname, '../packages/core/src/renderer.ts'),
    },
  },
})
