// fallow-ignore-file code-duplication
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

export default defineConfig({
  logLevel: process.argv.includes('--watch') ? 'warn' : undefined,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'process.env': '{}',
  },
  resolve: {
    alias: {
      '@nuxyorg/ui': path.resolve(__dirname, 'src/index.ts'),
      '@nuxyorg/core': path.resolve(repoRoot, 'packages/core/src/renderer.ts'),
      '@nuxyorg/extension-sdk': path.resolve(repoRoot, 'packages/extension-sdk/src/index.ts'),
    },
  },
  plugins: [
    {
      name: 'inline-css',
      closeBundle() {
        const jsPath = path.resolve(__dirname, 'frontend.js')
        const cssPath = path.resolve(__dirname, 'style.css')

        if (!fs.existsSync(cssPath)) return
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
    cssCodeSplit: false,
    ...(process.argv.includes('--watch')
      ? {
          watch: {
            // closeBundle inlines CSS into frontend.js after each build — ignore those writes.
            exclude: [path.resolve(__dirname, 'frontend.js'), path.resolve(__dirname, 'style.css')],
          },
        }
      : {}),
    rollupOptions: {
      output: {
        entryFileNames: 'frontend.js',
      },
    },
  },
})
