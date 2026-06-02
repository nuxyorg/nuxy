import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

const EXT_PATH = process.env.NUXY_EXT_PATH
if (!EXT_PATH) {
  throw new Error('NUXY_EXT_PATH is not set. Use: pnpm dev-ext <extension-name>')
}

const EXT_NAME = process.env.NUXY_EXT_NAME ?? path.basename(EXT_PATH)
const MOCKS_PATH = path.join(EXT_PATH, 'dev/mocks.ts')
const BACKEND_PATH = path.join(EXT_PATH, 'backend.ts')

// Minimal CoreContext mock for running the extension backend in Node.js (server-side).
// No vitest — just plain async functions with sensible no-op defaults.
function createServerCore(handlers: Record<string, (p?: unknown) => Promise<unknown>>) {
  return {
    registry: {
      registerTool: () => {},
      registerProvider: () => {},
      registerOrchestrator: () => {},
      registerTheme: () => {},
      registerIconPack: () => {},
      getCallableTools: () => [],
    },
    ipc: {
      handle(channel: string, fn: (p?: unknown) => Promise<unknown>) {
        handlers[channel] = fn
      },
      broadcast: () => {},
    },
    storage: { read: async () => null, write: async () => {} },
    clipboard: {
      readText: async () => '',
      writeText: async () => {},
      readImage: async () => null,
      writeImage: async () => {},
      writeFiles: async () => {},
    },
    settings: { read: async () => null, write: async () => {} },
    fs: {
      fileExists: async () => false,
      readDir: async () => [],
      readFile: async () => '',
      readFileBinary: async () => new Uint8Array(),
      writeFile: async () => {},
      mkdir: async () => {},
      rm: async () => {},
      stat: async () => null,
      rename: async () => {},
      homedir: () => os.homedir(),
      tmpdir: () => os.tmpdir(),
    },
    logger: { info: () => {}, warn: () => {}, error: () => {}, silly: () => {} },
    i18n: { locale: 'en', dir: 'ltr' as const, t: (key: string) => key },
    config: { get: async () => ({}) },
    extensions: { invoke: async () => ({ success: true, data: null }) },
    db: { open: async () => null },
    shell: { open: async () => {}, exec: async () => '', spawn: async () => null },
    media: { getNowPlaying: async () => null },
  }
}

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' }),

    // virtual:ext-mocks — loads dev/mocks.ts when present, empty object otherwise
    {
      name: 'ext-mocks',
      resolveId(id) {
        if (id === 'virtual:ext-mocks') return '\0virtual:ext-mocks'
      },
      load(id) {
        if (id !== '\0virtual:ext-mocks') return
        if (fs.existsSync(MOCKS_PATH)) return `export { default } from '${MOCKS_PATH}'`
        return 'export default {}'
      },
    },

    // Runs the extension backend in the Vite dev server (Node.js context).
    // Exposes POST /api/invoke so the browser mock-core can call real handlers
    // instead of returning null for unknown channels.
    {
      name: 'ext-backend-runner',
      configureServer(server) {
        if (!fs.existsSync(BACKEND_PATH)) return

        const handlers: Record<string, (p?: unknown) => Promise<unknown>> = {}
        let initPromise: Promise<void> | null = null

        function ensureInit(): Promise<void> {
          if (!initPromise) {
            initPromise = (async () => {
              try {
                const mod = await server.ssrLoadModule(BACKEND_PATH)
                if (typeof mod.register !== 'function') return
                await mod.register(createServerCore(handlers))
                // Brief pause so async init (storage reads, etc.) can settle
                await new Promise((r) => setTimeout(r, 80))
                console.log(
                  `\n  [ext-devserver] Backend ready — channels: ${Object.keys(handlers).join(', ') || '(none)'}\n`
                )
              } catch (err) {
                console.warn('\n  [ext-devserver] Backend load warning:', err, '\n')
              }
            })()
          }
          return initPromise
        }

        server.middlewares.use('/api/invoke', (req, res) => {
          if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }

          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk })
          req.on('end', async () => {
            await ensureInit()
            try {
              const { channel, payload } = JSON.parse(body || '{}')
              const handler = handlers[channel]
              const data = handler ? await handler(payload) : undefined
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                data: data !== undefined ? data : null,
                hasHandler: !!handler,
              }))
            } catch (err) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: String(err) }))
            }
          })
        })
      },
    },
  ],

  define: {
    __EXT_NAME__: JSON.stringify(EXT_NAME),
  },

  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '~ext': EXT_PATH,
      // Use ui-default's real implementations — packages/ui hooks delegate to window.UI
      // which would cause infinite recursion if window.UI is set from the same package.
      '@nuxy/ui': path.resolve(repoRoot, 'extensions/ui-default/src/index.tsx'),
      '@nuxy/core': path.resolve(repoRoot, 'packages/core/src/index.ts'),
      '@nuxy/extension-sdk': path.resolve(repoRoot, 'packages/extension-sdk/src/index.ts'),
    },
  },

  optimizeDeps: {
    exclude: ['~ext'],
  },

  server: {
    port: 5174,
    open: true,
    fs: { allow: [repoRoot] },
  },
})
