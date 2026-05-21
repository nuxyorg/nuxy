import type { CoreContext } from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'

interface ExtensionModule {
  register: (core: CoreContext) => void | Promise<void>
}

function resolveExtensionModule(extModule: Record<string, unknown>): ExtensionModule | undefined {
  if (extModule && typeof extModule.register === 'function') {
    return extModule as ExtensionModule
  }
  const def = extModule?.default as Record<string, unknown> | undefined
  if (def && typeof def.register === 'function') {
    return def as ExtensionModule
  }
  const nested = def?.default as Record<string, unknown> | undefined
  if (nested && typeof nested.register === 'function') {
    return nested as ExtensionModule
  }
  return undefined
}

export async function loadExtensionModule(
  absolutePath: string,
  core: CoreContext,
  logger: WorkerLogger
): Promise<void> {
  logger.log('info', 'Loader', 'Loading extension module: ' + absolutePath)
  const extModule = await import(/* @vite-ignore */ absolutePath)
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
