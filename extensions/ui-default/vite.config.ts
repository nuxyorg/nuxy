import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  resolve: {
    alias: {
      '@nuxy/ui': path.resolve(repoRoot, 'packages/ui/src/index.tsx'),
    },
  },
  plugins: [
    // Classic JSX runtime → React.createElement, compatible with window.React.
    // Automatic runtime would require react/jsx-runtime which isn't on window.
    react({ jsxRuntime: 'classic' }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/entry.ts'),
      formats: ['iife'],
      name: 'NuxyUIDefault',
      fileName: () => 'frontend.js',
    },
    outDir: '.',
    emptyOutDir: false,
    // Emit a single CSS file (style.css) — the inline-css.mjs script
    // merges it into frontend.js after the build, since nuxy-ext://
    // protocol can only serve one file per extension entry.
    cssCodeSplit: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'window.React',
          'react-dom': 'window.ReactDOM',
        },
        entryFileNames: 'frontend.js',
      },
    },
  },
})

