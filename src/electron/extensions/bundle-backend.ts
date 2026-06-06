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
 * Uses `platform: 'browser'` (not `node`) so esbuild cannot resolve Node built-ins
 * at build time. Static `import 'fs'` / `require('fs')` fail the bundle step;
 * scanner `detectNodeImports` is a second gate at install time.
 *
 * Note: variable dynamic imports (`import(variable)`) are not blocked — workers
 * still run in Node. Full isolation would need `isolated-vm` (see pain-points P7).
 */
export function bundleExtensionBackend(entryPath: string, extDir: string): string {
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
    esbuild.buildSync({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      outfile,
      packages: 'bundle',
      logLevel: 'warning',
      alias: {
        '@nuxy/extension-sdk': path.join(repoRoot, 'packages/extension-sdk/src/index.ts'),
        '@nuxy/core': path.join(repoRoot, 'packages/core/src/index.ts'),
      },
      loader: { '.ts': 'ts', '.tsx': 'tsx' },
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
