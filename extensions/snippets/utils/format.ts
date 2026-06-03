const EXT_ID = 'com.nuxy.snippets'

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC failed')
    return r.data as T
  })
}

export function timeAgo(dateString: string): string {
  if (!dateString) return ''
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
