import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, basename } from 'path'
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
  return code.replace(/(from\s+['"])(\.{1,2}\/[^'"]*)\.(ts|tsx)(['"]\s*;?)/g, '$1$2.mjs$4')
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

  const tmpDir = join(
    tmpdir(),
    `nuxy-ext-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  mkdirSync(tmpDir, { recursive: true })

  const tsFiles = readdirSync(extDir).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts')
  )

  for (const file of tsFiles) {
    const src = readFileSync(join(extDir, file), 'utf8')
    const transpiled = ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
        jsx: file.endsWith('.tsx') ? ts.JsxEmit.React : ts.JsxEmit.None,
      },
    })
    const output = rewriteLocalTsImports(transpiled.outputText)
    const outName = file.replace(/\.(ts|tsx)$/, '.mjs')
    writeFileSync(join(tmpDir, outName), output, 'utf8')
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
  if (absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx')) {
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
