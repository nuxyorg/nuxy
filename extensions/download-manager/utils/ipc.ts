import { invokeExtensionIpc } from '@nuxyorg/extension-sdk'

const EXT_ID = 'com.nuxy.download-manager'

export function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return invokeExtensionIpc<T>(EXT_ID, channel, payload)
}
