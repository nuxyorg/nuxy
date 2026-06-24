import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron/simple'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const workspaceAliases = {
  '@nuxyorg/core': path.resolve(repoRoot, 'packages/core/src/renderer.ts'),
  '@nuxyorg/extension-host': path.resolve(repoRoot, 'packages/extension-host/src/index.ts'),
  '@nuxyorg/extension-sdk': path.resolve(repoRoot, 'packages/extension-sdk/src/index.ts'),
}

const extensionsReady = process.env.NUXY_EXTENSIONS_READY === '1'

export default defineConfig({
  logLevel: 'warn',
  clearScreen: false,
  resolve: {
    alias: workspaceAliases,
  },
  plugins: [
    {
      name: 'nxt-extensions',
      async configureServer(_server) {
        if (extensionsReady) {
          // Watcher already started by scripts/dev.mjs before vite boots.
          return
        }

        // Fallback when vite is started directly (without scripts/dev.mjs)
        const { execFile } = await import('child_process')
        const { promisify } = await import('util')
        const fs = await import('fs')
        const os = await import('os')
        const execFileAsync = promisify(execFile)
        const nxtBin = path.resolve(repoRoot, 'packages/nxt/bin/nxt.js')
        const extensionsDir = path.resolve(repoRoot, 'extensions')
        const nuxyExtDir = path.join(os.homedir(), '.nxy', 'extensions')
        const skipDirs = new Set(['node_modules', '.git', 'dist'])

        if (fs.existsSync(nuxyExtDir) && fs.lstatSync(nuxyExtDir).isSymbolicLink()) {
          fs.unlinkSync(nuxyExtDir)
        }
        fs.mkdirSync(nuxyExtDir, { recursive: true })

        const extDirs = fs
          .readdirSync(extensionsDir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !skipDirs.has(e.name))
          .map((e) => path.join(extensionsDir, e.name))
          .filter((d) => fs.existsSync(path.join(d, 'manifest.json')))

        await Promise.all(
          extDirs.map(async (extDir) => {
            await execFileAsync('node', [nxtBin, 'package', '--force'], { cwd: extDir })
            await execFileAsync('node', [nxtBin, 'install'], { cwd: extDir })
          })
        )

        const { getPaths, startExtensionWatcher } = await import(
          pathToFileURL(path.join(repoRoot, 'scripts/lib/dev-extensions.mjs')).href
        )
        startExtensionWatcher(getPaths())
      },
    },
    electron({
      main: {
        entry: 'electron/bootstrap/main.ts',
        vite: {
          resolve: {
            alias: workspaceAliases,
          },
          build: {
            rollupOptions: {
              input: {
                index: 'electron/bootstrap/main.ts',
                'worker/extension-host': path.resolve(
                  repoRoot,
                  'packages/extension-host/src/index.ts'
                ),
              },
              external: ['typescript', 'dbus-next', 'electron', 'esbuild'],
            },
          },
        },
      },
      preload: {
        input: 'electron/bootstrap/preload.ts',
      },
    }),
  ],
  base: './',
})
