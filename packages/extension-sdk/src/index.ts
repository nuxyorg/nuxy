import type { CoreContext } from '@nuxyorg/core'

export { createStore } from './store'
export type { Store, Unsubscribe } from './store'

export { createTranslator } from './frontend-i18n'
export type { TranslateFn, Translator } from './frontend-i18n'

export { getFocusableElements, trapTabKey } from './focus-trap'

export { applyUiFontSettings, DEFAULT_FONT_FAMILY_MAP, resolveFontFamily } from './ui-font'

export { BaseExtensionController } from './controller'

export { invokeExtensionIpc } from './invoke-ipc'

export {
  getToolOnComplete,
  shouldSuppressBlurHide,
  syncBlurSuppression,
  setToolSearchPlaceholder,
  completeToolAction,
} from './tool-behavior'
export type { ToolOnCompleteBehavior } from './tool-behavior'

export type {
  CoreContext,
  ExtensionManifest,
  ExtensionType,
  IpcInvokeContext,
  IpcResult,
  HostChannelName,
  LoadedExtension,
} from '@nuxyorg/core'

export { HostChannel } from '@nuxyorg/core'

/** Extension backend entry — implement and export from `backend.js` / `backend.ts`. */
export interface ExtensionModule {
  register(core: CoreContext): void | Promise<void>
}

/**
 * Wraps an extension module for clearer authoring and JSDoc/TS inference.
 *
 * @example
 * ```ts
 * import { defineExtension } from '@nuxyorg/extension-sdk'
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

/**
 * Shape of a single IPC channel: what it accepts and what it returns.
 * Define this map in your extension's `types.ts`:
 *
 * ```ts
 * export interface IpcChannels {
 *   getItems: { input: void; output: MyItem[] }
 *   createItem: { input: { title: string }; output: MyItem }
 * }
 * ```
 */
export type IpcChannelMap = Record<string, { input: unknown; output: unknown }>

/**
 * Typed invoke function for extension frontends.
 * Channel names and payload/return types are inferred from `TChannels`.
 *
 * Usage in `frontend.ts`:
 * ```ts
 * import type { TypedInvoker } from '@nuxyorg/extension-sdk'
 * import type { IpcChannels } from './types.ts'
 *
 * const invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
 *   const res = await window.core.ipc.invoke(EXT_ID, channel, args[0])
 *   if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
 *   return res.data
 * }
 * ```
 */
export type TypedInvoker<TChannels extends IpcChannelMap> = <K extends keyof TChannels & string>(
  channel: K,
  ...args: TChannels[K]['input'] extends void ? [] : [payload: TChannels[K]['input']]
) => Promise<TChannels[K]['output']>
