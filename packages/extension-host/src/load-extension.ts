import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, basename, relative } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import type { CoreContext } from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'

interface ExtensionModule {
  register: (core: CoreContext) => void | Promise<void>
}

function resolveExtensionModule(extModule: Record<string, unknown>): ExtensionModule | undefined {
  if (extModule && typeof extModule.register === 'function') {
    return extModule as unknown as ExtensionModule
  }
  const def = extModule?.default as Record<string, unknown> | undefined
  if (def && typeof def.register === 'function') {
    return def as unknown as ExtensionModule
  }
  const nested = def?.default as Record<string, unknown> | undefined
  if (nested && typeof nested.register === 'function') {
    return nested as unknown as ExtensionModule
  }
  return undefined
}

function rewriteLocalTsImports(code: string): string {
  return code.replace(/(from\s+['"])(\.{1,2}\/[^'"]*)\.(ts)(['"]\s*;?)/g, '$1$2.mjs$4')
}

async function transpileTsBackend(fileUrl: string, logger: WorkerLogger): Promise<string> {
  const fsPath = fileURLToPath(fileUrl)
  const extDir = dirname(fsPath)
  const backendBasename = basename(fsPath)

  let ts: typeof import('typescript') | undefined
  try {
    ts = await import('typescript')
  } catch {
    logger.log('warn', 'Loader', 'TypeScript not available — loading raw source')
    return fileUrl
  }

  const tmpDir = join(tmpdir(), `nuxy-ext-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })

  const tsFiles: string[] = []
  const walkDir = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry !== 'node_modules' && entry !== '.git') walkDir(full)
      } else if (
        entry.endsWith('.ts') &&
        !entry.endsWith('.test.ts') &&
        !entry.endsWith('.spec.ts')
      ) {
        tsFiles.push(full)
      }
    }
  }
  walkDir(extDir)

  for (const file of tsFiles) {
    const src = readFileSync(file, 'utf8')
    const transpiled = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        experimentalDecorators: true,
      },
    })
    const output = rewriteLocalTsImports(transpiled.outputText)
    const relPath = relative(extDir, file)
    const outName = relPath.replace(/\.ts$/, '.mjs')
    const outPath = join(tmpDir, outName)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, output, 'utf8')
  }

  const backendOutName = backendBasename.replace(/\.(ts|tsx)$/, '.mjs')
  const tmpPath = join(tmpDir, backendOutName)
  logger.log('info', 'Loader', `Transpiled TS backend → ${tmpPath}`)
  return pathToFileURL(tmpPath).href
}

export async function loadExtensionModule(
  absolutePath: string,
  core: CoreContext,
  logger: WorkerLogger
): Promise<void> {
  logger.log('info', 'Loader', 'Loading extension module: ' + absolutePath)

  let loadPath = absolutePath
  if (absolutePath.endsWith('.ts')) {
    loadPath = await transpileTsBackend(absolutePath, logger)
  }

  const extModule = await import(/* @vite-ignore */ loadPath)
  logger.log('info', 'Loader', 'Module loaded. Keys: ' + Object.keys(extModule || {}).join(', '))

  const ext = resolveExtensionModule(extModule as Record<string, unknown>)

  if (ext?.register) {
    logger.log('info', 'Loader', 'Calling ext.register(core)...')
    await ext.register(core)
    logger.log('info', 'Loader', 'Extension registered successfully.')
  } else {
    logger.log('warn', 'Loader', 'No register() function found on extension module.')
  }
}
