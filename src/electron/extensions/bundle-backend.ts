import esbuild from 'esbuild'
import module from 'module'
import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'

const BUILTIN_MODULES = new Set([
  ...module.builtinModules,
  ...module.builtinModules.map((name) => `node:${name}`),
])

function isNodeBuiltin(importPath: string): boolean {
  const base = importPath.split('/')[0]
  return BUILTIN_MODULES.has(importPath) || BUILTIN_MODULES.has(base)
}

function repoRootFromHere(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
}

function bundleCachePath(extDir: string, entryPath: string): string {
  const stat = fs.statSync(entryPath)
  const hash = createHash('sha256')
  hash.update(entryPath)
  hash.update(String(stat.mtimeMs))
  hash.update(String(stat.size))
  const cacheKey = hash.digest('hex').slice(0, 16)
  const cacheDir = path.join(tmpdir(), 'nuxy-backend-bundle', path.basename(extDir))
  return path.join(cacheDir, `${cacheKey}.mjs`)
}

/**
 * Pre-bundle an extension backend for worker execution.
 *
 * Uses `platform: 'node'` to resolve dependencies from node_modules.
 * Node built-ins are blocked via an esbuild plugin to ensure sandbox safety.
 */
export async function bundleExtensionBackend(entryPath: string, extDir: string): Promise<string> {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Extension backend entry not found: ${entryPath}`)
  }

  const outfile = bundleCachePath(extDir, entryPath)
  if (fs.existsSync(outfile)) {
    return outfile
  }

  fs.mkdirSync(path.dirname(outfile), { recursive: true })

  const repoRoot = repoRootFromHere()
  try {
    await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile,
      // electron is provided by the host process — keep it external.
      // Everything else (npm deps) is bundled from the extension's own node_modules.
      external: ['electron', ...BUILTIN_MODULES],
      logLevel: 'warning',
      alias: {
        '@nuxy/extension-sdk': path.join(repoRoot, 'packages/extension-sdk/src/index.ts'),
        '@nuxy/core': path.join(repoRoot, 'packages/core/src/index.ts'),
      },
      loader: { '.ts': 'ts', '.tsx': 'tsx' },
      // Resolve npm deps from the extension's own node_modules first.
      nodePaths: [path.join(extDir, 'node_modules')],
      plugins: [
        {
          // Block Node built-in imports (fs, path, child_process, …) with a hard
          // build error. This preserves the sandbox guarantee that was previously
          // achieved via platform:'browser', while still letting platform:'node'
          // resolve third-party npm packages correctly.
          name: 'block-node-builtins',
          setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
              if (isNodeBuiltin(args.path)) {
                return {
                  errors: [
                    {
                      text: `Extension sandbox: Node built-in "${args.path}" is not allowed`,
                    },
                  ],
                }
              }
              return undefined
            })
          },
        },
      ],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Could not resolve') && BUILTIN_MODULES.size > 0) {
      for (const builtin of BUILTIN_MODULES) {
        if (message.includes(`"${builtin}"`) || message.includes(`'${builtin}'`)) {
          throw new Error(`Extension sandbox: Node built-in "${builtin}" is not allowed`)
        }
      }
    }
    throw err
  }

  return outfile
}
