/// <reference types="vite/client" />
import type { IpcResult } from '@nuxyorg/core'
import { extensionHandlers } from './kernel-handlers/extensions.js'
import { compositionHandlers } from './kernel-handlers/composition.js'
import { themeHandlers } from './kernel-handlers/themes.js'
import { i18nHandlers } from './kernel-handlers/i18n.js'
import { systemHandlers } from './kernel-handlers/system.js'

const handlers: Record<string, (payload: unknown) => IpcResult | Promise<IpcResult>> = {
  ...extensionHandlers,
  ...compositionHandlers,
  ...themeHandlers,
  ...i18nHandlers,
  ...systemHandlers,
}

export async function handleKernelChannel(ch: string, pl: unknown): Promise<IpcResult> {
  const handler = handlers[ch]
  if (handler) return handler(pl)
  return { success: false, error: `Unknown kernel channel: ${ch}`, code: 'UNKNOWN_CHANNEL' }
}
