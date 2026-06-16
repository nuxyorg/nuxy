import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'

/** Keep in sync with packages/nxt/lib/frontend-runtime.mjs */
export const FRONTEND_RUNTIME_ALIASES = {
  '@nuxyorg/core': 'nuxy-ext://core/index.js',
  '@nuxyorg/extension-sdk': 'nuxy-ext://sdk/index.js',
} as const

export function frontendBundleOutPath(extDir: string): string {
  return path.join(extDir, '_frontend.bundle.mjs')
}

export function shouldSkipFrontendBundle(manifest: {
  entry?: { frontend?: string }
  type?: string
}): boolean {
  const entry = manifest.entry?.frontend
  if (!entry) return true
  if (manifest.type === 'theme' || manifest.type === 'iconpack') return true
  // Pre-built artifact (e.g. ui-default Vite output)
  if (entry.endsWith('.js')) return true
  return false
}

/**
 * Browser-bundle an extension frontend entry. Workspace packages are kept external
 * via explicit nuxy-ext:// aliases (see FRONTEND_RUNTIME_ALIASES).
 */
export async function bundleExtensionFrontend(
  entryPath: string,
  extDir: string,
  outfile?: string
): Promise<string> {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Extension frontend entry not found: ${entryPath}`)
  }

  const buildOptions: esbuild.BuildOptions = {
    entryPoints: [entryPath],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    absWorkingDir: extDir,
    alias: { ...FRONTEND_RUNTIME_ALIASES },
    external: Object.values(FRONTEND_RUNTIME_ALIASES),
    loader: { '.ts': 'ts', '.tsx': 'tsx', '.json': 'json' },
    logLevel: 'warning',
    nodePaths: [path.join(extDir, 'node_modules')],
  }

  if (outfile) {
    await esbuild.build({ ...buildOptions, outfile })
    return outfile
  }

  const result = await esbuild.build({ ...buildOptions, write: false })
  const output = result.outputFiles[0]?.text
  if (!output) throw new Error(`Frontend bundle produced no output for ${entryPath}`)
  return output
}
