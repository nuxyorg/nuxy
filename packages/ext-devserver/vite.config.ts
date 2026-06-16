import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Detect monorepo by checking for the workspace root above this package.
// When installed from npm, __dirname is inside node_modules and the workspace
// file won't be found two levels up.
const possibleRepoRoot = path.resolve(__dirname, '../..')
const isMonorepo =
  fs.existsSync(path.join(possibleRepoRoot, 'pnpm-workspace.yaml')) &&
  fs.existsSync(path.join(possibleRepoRoot, 'packages/core/src/index.ts'))

const fsAllow: string[] = []

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
    storage: (() => {
      const store = new Map<string, unknown>()
      return {
        read: async (key: string) => store.get(key) ?? null,
        write: async (key: string, value: unknown) => { store.set(key, value) },
      }
    })(),
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

// Build Vite alias map.
// Monorepo: resolve @nuxyorg/* from TypeScript source for fast HMR.
// Standalone (installed via npm): let Vite resolve @nuxyorg/core and
// @nuxyorg/extension-sdk from node_modules; alias @nuxyorg/ui to the
// bundled ui-default package so extension frontends have real components.
const alias: Record<string, string> = { '~ext': EXT_PATH }

if (isMonorepo) {
  alias['@nuxyorg/ui'] = path.resolve(possibleRepoRoot, 'extensions/ui-default/src/index.ts')
  alias['@nuxyorg/core'] = path.resolve(possibleRepoRoot, 'packages/core/src/index.ts')
  alias['@nuxyorg/extension-sdk'] = path.resolve(possibleRepoRoot, 'packages/extension-sdk/src/index.ts')
  fsAllow.push(possibleRepoRoot)
} else {
  // @nuxyorg/ui-default is a dependency of this package; alias @nuxyorg/ui to it
  // so extension frontends can use UI components without extra configuration.
  try {
    const uiDefaultPkg = path.resolve(__dirname, '..', 'ui-default', 'package.json')
    const flatNodeModules = path.resolve(__dirname, '../../@nuxyorg/ui-default')
    const candidate = fs.existsSync(uiDefaultPkg)
      ? path.resolve(__dirname, '..', 'ui-default', 'src', 'index.ts')
      : path.resolve(flatNodeModules, 'src', 'index.ts')
    if (fs.existsSync(candidate)) {
      alias['@nuxyorg/ui'] = candidate
    }
  } catch {
    // ui-default not resolvable — @nuxyorg/ui will fall back to node_modules or stub
  }
}

export default defineConfig({
  plugins: [
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
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end()
            return
          }

          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk
          })
          req.on('end', async () => {
            await ensureInit()
            try {
              const { channel, payload } = JSON.parse(body || '{}')
              const handler = handlers[channel]
              const data = handler ? await handler(payload) : undefined
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  success: true,
                  data: data !== undefined ? data : null,
                  hasHandler: !!handler,
                })
              )
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

  resolve: { alias },

  optimizeDeps: {
    exclude: ['~ext'],
  },

  server: {
    port: 5174,
    open: true,
    fs: { allow: fsAllow.length ? fsAllow : undefined },
  },
})
