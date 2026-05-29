import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  resolve: {
    alias: {
      '@nuxy/ui': path.resolve(__dirname, 'src/index.tsx'),
    },
  },
  plugins: [
    // Classic JSX runtime → React.createElement, compatible with window.React.
    // Automatic runtime would require react/jsx-runtime which isn't on window.
    react({ jsxRuntime: 'classic' }),
    {
      name: 'inline-css',
      closeBundle() {
        const jsPath = path.resolve(__dirname, 'frontend.js')
        const cssPath = path.resolve(__dirname, 'style.css')

        if (!fs.existsSync(cssPath)) {
          console.log('[inline-css] No style.css found — nothing to inline.')
          return
        }
        if (!fs.existsSync(jsPath)) {
          console.error('[inline-css] frontend.js not found — did the build run?')
          return
        }

        const css = fs.readFileSync(cssPath, 'utf8')
        const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`')
        const injection =
          `;(function(){` +
          `var s=document.createElement('style');` +
          `s.textContent=\`${escaped}\`;` +
          `document.head.appendChild(s);` +
          `})()\n`

        fs.appendFileSync(jsPath, injection, 'utf8')
        fs.unlinkSync(cssPath)

        console.log(`[inline-css] Inlined ${css.length} bytes of CSS into frontend.js`)
      },
    },
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
