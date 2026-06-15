import type { TypedInvoker } from '@nuxy/extension-sdk'
import type { IpcChannels } from '../types.ts'

const EXT_ID = 'com.nuxy.file-transfer'

type IpcResult<T> = { success: boolean; data?: T; error?: string }

export function createInvoker(): TypedInvoker<IpcChannels> {
  return async (channel, ...args) => {
    const res = (await window.core.ipc.invoke(EXT_ID, channel, args[0])) as IpcResult<
      IpcChannels[typeof channel]['output']
    >
    if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
    return res.data as IpcChannels[typeof channel]['output']
  }
}
