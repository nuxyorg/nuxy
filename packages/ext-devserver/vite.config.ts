import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function resolvePackageDir(pkgName: string): string | null {
  try {
    return path.dirname(require.resolve(`${pkgName}/package.json`))
  } catch {
    return null
  }
}

function resolvePackageFile(pkgName: string, candidates: string[]): string | null {
  const pkgDir = resolvePackageDir(pkgName)
  if (!pkgDir) return null
  for (const rel of candidates) {
    const full = path.join(pkgDir, rel)
    if (fs.existsSync(full)) return full
  }
  return null
}

function resolveUiDefaultPaths(): {
  uiRegisterPath: string | null
  uiBaseCssPath: string | null
  uiToolHostCssPath: string | null
  uiIndexPath: string | null
} {
  const pkgDir = resolvePackageDir('@nuxyorg/ui-default')
  if (!pkgDir) {
    return {
      uiRegisterPath: null,
      uiBaseCssPath: null,
      uiToolHostCssPath: null,
      uiIndexPath: null,
    }
  }
  const srcDir = path.join(pkgDir, 'src')
  return {
    uiIndexPath: fs.existsSync(path.join(srcDir, 'index.ts'))
      ? path.join(srcDir, 'index.ts')
      : null,
    uiRegisterPath: fs.existsSync(path.join(srcDir, 'register-components.ts'))
      ? path.join(srcDir, 'register-components.ts')
      : null,
    uiBaseCssPath: fs.existsSync(path.join(srcDir, 'styles/base.css'))
      ? path.join(srcDir, 'styles/base.css')
      : null,
    uiToolHostCssPath: fs.existsSync(path.join(srcDir, 'components/ToolHost/index.css'))
      ? path.join(srcDir, 'components/ToolHost/index.css')
      : null,
  }
}

const possibleRepoRoot = path.resolve(__dirname, '../..')
const isMonorepo =
  fs.existsSync(path.join(possibleRepoRoot, 'pnpm-workspace.yaml')) &&
  fs.existsSync(path.join(possibleRepoRoot, 'packages/core/src/index.ts'))

const fsAllow: string[] = []

function resolveExtPath(): string {
  if (process.env.NUXY_EXT_PATH) return path.resolve(process.env.NUXY_EXT_PATH)
  const cwdManifest = path.join(process.cwd(), 'manifest.json')
  if (fs.existsSync(cwdManifest)) return process.cwd()
  throw new Error(
    'NUXY_EXT_PATH is not set. Run nuxy-ext-dev from your extension folder, or: pnpm dev-ext <name>'
  )
}

const EXT_PATH = resolveExtPath()

const manifest = JSON.parse(fs.readFileSync(path.join(EXT_PATH, 'manifest.json'), 'utf8')) as {
  id: string
  name: string
  entry?: { frontend?: string; element?: string }
  locales?: { default: string; supported: string[]; dir?: string }
}

const EXT_ID = manifest.id
const EXT_NAME = process.env.NUXY_EXT_NAME ?? path.basename(EXT_PATH)
const EXT_ELEMENT = manifest.entry?.element ?? `nuxy-tool-${EXT_NAME}`
const MOCKS_PATH = path.join(EXT_PATH, 'dev/mocks.ts')
const BACKEND_PATH = path.join(EXT_PATH, 'backend.ts')

const SHELL_PATH = isMonorepo ? path.join(possibleRepoRoot, 'extensions/shell') : null
const SHELL_BACKEND_PATH = SHELL_PATH ? path.join(SHELL_PATH, 'backend.ts') : null
const USE_REAL_SHELL = Boolean(SHELL_PATH && fs.existsSync(path.join(SHELL_PATH, 'frontend.ts')))

const shellManifest =
  SHELL_PATH && fs.existsSync(path.join(SHELL_PATH, 'manifest.json'))
    ? (JSON.parse(
        fs.readFileSync(path.join(SHELL_PATH, 'manifest.json'), 'utf8')
      ) as typeof manifest)
    : null

const DEV_EXT_PATHS: Record<string, string> = { [manifest.id]: EXT_PATH }
if (USE_REAL_SHELL && SHELL_PATH) {
  DEV_EXT_PATHS['com.nuxy.shell'] = SHELL_PATH
}

const DEV_LOCALE_EXTENSIONS = [
  manifest.locales ? { id: manifest.id, locales: manifest.locales } : null,
  USE_REAL_SHELL && shellManifest?.locales
    ? { id: 'com.nuxy.shell', locales: shellManifest.locales }
    : null,
].filter(Boolean)

const THEME_DARK_PATH = isMonorepo
  ? path.join(possibleRepoRoot, 'extensions/theme-dark/theme.json')
  : path.join(__dirname, 'assets/theme.json')
const ICONS_JSON_PATH = isMonorepo
  ? path.join(possibleRepoRoot, 'extensions/icons-default/icons.json')
  : null
const ICONS_DIR = isMonorepo ? path.join(possibleRepoRoot, 'extensions/icons-default/icons') : null

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
        write: async (key: string, value: unknown) => {
          store.set(key, value)
        },
      }
    })(),
    clipboard: {
      readText: async () => '',
      writeText: async () => {},
      readImage: async () => null,
      writeImage: async () => {},
      writeFiles: async () => {},
    },
    settings: {
      read: async () => null,
      write: async () => {},
      readAllExtension: async () => ({}),
      writeAllExtension: async () => {},
    },
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

const alias: Record<string, string> = { '~ext': EXT_PATH }
let uiRegisterPath: string | null = null
let uiBaseCssPath: string | null = null
let uiToolHostCssPath: string | null = null

if (isMonorepo) {
  alias['@nuxyorg/ui'] = path.resolve(possibleRepoRoot, 'extensions/ui-default/src/index.ts')
  alias['@nuxyorg/core'] = path.resolve(possibleRepoRoot, 'packages/core/src/renderer.ts')
  alias['@nuxyorg/extension-sdk'] = path.resolve(
    possibleRepoRoot,
    'packages/extension-sdk/src/index.ts'
  )
  uiRegisterPath = path.resolve(
    possibleRepoRoot,
    'extensions/ui-default/src/register-components.ts'
  )
  uiBaseCssPath = path.resolve(possibleRepoRoot, 'extensions/ui-default/src/styles/base.css')
  uiToolHostCssPath = path.resolve(
    possibleRepoRoot,
    'extensions/ui-default/src/components/ToolHost/index.css'
  )
  fsAllow.push(possibleRepoRoot)
} else {
  const corePath = resolvePackageFile('@nuxyorg/core', [
    'src/renderer.ts',
    'dist/renderer.js',
    'src/index.ts',
    'dist/index.js',
  ])
  const sdkPath = resolvePackageFile('@nuxyorg/extension-sdk', ['src/index.ts', 'dist/index.js'])
  const uiPaths = resolveUiDefaultPaths()
  if (corePath) alias['@nuxyorg/core'] = corePath
  if (sdkPath) alias['@nuxyorg/extension-sdk'] = sdkPath
  if (uiPaths.uiIndexPath) alias['@nuxyorg/ui'] = uiPaths.uiIndexPath
  uiRegisterPath = uiPaths.uiRegisterPath
  uiBaseCssPath = uiPaths.uiBaseCssPath
  uiToolHostCssPath = uiPaths.uiToolHostCssPath
  fsAllow.push(EXT_PATH, __dirname)
}

function resolveNuxyExtModule(source: string): string | null {
  const match = source.match(/^nuxy-ext:\/\/([^/]+)\/(.+)$/)
  if (!match) return null
  const [, extId, file] = match
  if (extId === EXT_ID && file === 'frontend.js') {
    return path.join(EXT_PATH!, manifest.entry?.frontend ?? 'frontend.ts')
  }
  if (USE_REAL_SHELL && extId === 'com.nuxy.shell' && file === 'frontend.js') {
    return path.join(SHELL_PATH!, 'frontend.ts')
  }
  return null
}

export default defineConfig({
  plugins: [
    {
      name: 'icon-cache-dev-loader',
      transform(code, id) {
        if (!id.endsWith('icon-cache.ts')) return
        if (code.includes('/dev/icons/')) return
        return code.replace(
          'const url = `nuxy-ext://${packExtId}/icons/${key}.svg`',
          'const url = `/dev/icons/${key}.svg`'
        )
      },
    },

    {
      name: 'tool-host-dev-loader',
      transform(code, id) {
        if (!id.endsWith('nuxy-tool-host.ts')) return
        if (code.includes('__NUXY_EXT_LOADERS__')) return
        return code.replace(
          'await dynamicImport(`nuxy-ext://${extId}/frontend.js`)',
          `const loaders = window.__NUXY_EXT_LOADERS__
  if (loaders && loaders[extId]) {
    await loaders[extId]()
    return
  }
  await dynamicImport(\`nuxy-ext://\${extId}/frontend.js\`)`
        )
      },
    },

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

    {
      name: 'ui-register',
      resolveId(id) {
        if (id === 'virtual:ui-register') return '\0virtual:ui-register'
      },
      load(id) {
        if (id !== '\0virtual:ui-register') return
        const imports: string[] = []
        if (uiBaseCssPath) imports.push(`import '${uiBaseCssPath}'`)
        if (uiToolHostCssPath) imports.push(`import '${uiToolHostCssPath}'`)
        if (uiRegisterPath) imports.push(`import '${uiRegisterPath}'`)
        return imports.join('\n')
      },
    },

    {
      name: 'shell-frontend',
      resolveId(id) {
        if (id === 'virtual:shell-frontend') return '\0virtual:shell-frontend'
        if (id.startsWith('nuxy-ext://')) {
          const resolved = resolveNuxyExtModule(id)
          if (resolved) return resolved
        }
      },
      load(id) {
        if (id === '\0virtual:shell-frontend' && USE_REAL_SHELL) {
          return `import '${path.join(SHELL_PATH!, 'frontend.ts')}'`
        }
      },
    },

    {
      name: 'ext-backend-runner',
      configureServer(server) {
        const handlerMaps = new Map<string, Record<string, (p?: unknown) => Promise<unknown>>>()
        let initPromise: Promise<void> | null = null

        async function loadBackend(extId: string, backendPath: string): Promise<void> {
          const handlers: Record<string, (p?: unknown) => Promise<unknown>> = {}
          handlerMaps.set(extId, handlers)
          const mod = await server.ssrLoadModule(backendPath)
          if (typeof mod.register !== 'function') return
          await mod.register(createServerCore(handlers))
        }

        function ensureInit(): Promise<void> {
          if (!initPromise) {
            initPromise = (async () => {
              const loaded: string[] = []
              try {
                if (SHELL_BACKEND_PATH && fs.existsSync(SHELL_BACKEND_PATH)) {
                  await loadBackend('com.nuxy.shell', SHELL_BACKEND_PATH)
                  loaded.push('com.nuxy.shell')
                }
                if (fs.existsSync(BACKEND_PATH)) {
                  await loadBackend(EXT_ID, BACKEND_PATH)
                  loaded.push(EXT_ID)
                }
                await new Promise((r) => setTimeout(r, 80))
                const channels = [...handlerMaps.entries()]
                  .map(
                    ([extId, handlers]) =>
                      `${extId}: ${Object.keys(handlers).join(', ') || '(none)'}`
                  )
                  .join(' | ')
                console.log(`\n  [ext-devserver] Backends ready — ${channels || '(none)'}\n`)
              } catch (err) {
                console.warn('\n  [ext-devserver] Backend load warning:', err, '\n')
              }
            })()
          }
          return initPromise
        }

        server.middlewares.use('/dev/theme.json', (_req, res) => {
          if (THEME_DARK_PATH && fs.existsSync(THEME_DARK_PATH)) {
            res.setHeader('Content-Type', 'application/json')
            res.end(fs.readFileSync(THEME_DARK_PATH, 'utf8'))
            return
          }
          res.statusCode = 404
          res.end()
        })

        server.middlewares.use('/dev/icons.json', (_req, res) => {
          if (ICONS_JSON_PATH && fs.existsSync(ICONS_JSON_PATH)) {
            res.setHeader('Content-Type', 'application/json')
            res.end(fs.readFileSync(ICONS_JSON_PATH, 'utf8'))
            return
          }
          res.statusCode = 404
          res.end()
        })

        server.middlewares.use('/dev/icons', (req, res, next) => {
          if (!ICONS_DIR || !req.url) return next()
          const match = req.url.match(/^\/([^/?#]+\.svg)(?:\?.*)?$/)
          if (!match) return next()
          const svgPath = path.join(ICONS_DIR, match[1]!)
          if (!fs.existsSync(svgPath)) {
            res.statusCode = 404
            res.end()
            return
          }
          res.setHeader('Content-Type', 'image/svg+xml')
          res.end(fs.readFileSync(svgPath, 'utf8'))
        })

        server.middlewares.use('/dev/locales/file', (req, res) => {
          if (!req.url) {
            res.statusCode = 400
            res.end()
            return
          }
          const url = new URL(req.url, 'http://localhost')
          const extId = url.searchParams.get('extId')
          const locale = url.searchParams.get('locale')
          if (!extId || !locale) {
            res.statusCode = 400
            res.end()
            return
          }
          const extPath = DEV_EXT_PATHS[extId]
          if (!extPath) {
            res.statusCode = 404
            res.end()
            return
          }
          const localesDir = path.join(extPath, 'locales')
          const filePath = path.join(localesDir, `${locale}.json`)
          if (!filePath.startsWith(localesDir) || !fs.existsSync(filePath)) {
            res.statusCode = 404
            res.end()
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(fs.readFileSync(filePath, 'utf8'))
        })

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
              const parsed = JSON.parse(body || '{}') as {
                extId?: string
                channel?: string
                payload?: unknown
              }
              const extId = parsed.extId ?? EXT_ID
              const channel = parsed.channel ?? ''
              const payload = parsed.payload
              const handlers = handlerMaps.get(extId)
              const handler = handlers?.[channel]
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
    __EXT_ID__: JSON.stringify(EXT_ID),
    __EXT_NAME__: JSON.stringify(EXT_NAME),
    __EXT_DISPLAY_NAME__: JSON.stringify(manifest.name),
    __EXT_ELEMENT__: JSON.stringify(EXT_ELEMENT),
    __USE_REAL_SHELL__: JSON.stringify(USE_REAL_SHELL),
    __DEV_LOCALE_EXTENSIONS__: JSON.stringify(DEV_LOCALE_EXTENSIONS),
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
