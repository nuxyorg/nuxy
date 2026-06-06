const EXT_ID = 'com.nuxy.translate'

export function ipc<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; data?: T; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC call failed')
    return r.data as T
  })
}
