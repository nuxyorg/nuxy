import type { CoreContext } from '@nuxy/core'

export type {
  CoreContext,
  ExtensionManifest,
  ExtensionType,
  IpcResult,
  HostChannel,
  HostChannelName,
} from '@nuxy/core'

export { HostChannel } from '@nuxy/core'

/** Extension backend entry — implement and export from `backend.js` / `backend.ts`. */
export interface ExtensionModule {
  register(core: CoreContext): void | Promise<void>
}

/**
 * Wraps an extension module for clearer authoring and JSDoc/TS inference.
 *
 * @example
 * ```ts
 * import { defineExtension } from '@nuxy/extension-sdk'
 *
 * export default defineExtension({
 *   register(core) {
 *     core.registry.registerTool({ name: 'my-tool' })
 *   }
 * })
 * ```
 */
export function defineExtension(module: ExtensionModule): ExtensionModule {
  return module
}

export { createMockCore } from './testing.js'

