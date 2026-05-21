import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts', '../extensions/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@nuxy/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
    },
  },
})
