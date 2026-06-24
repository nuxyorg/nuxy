/**
 * Invoke an extension IPC channel from the renderer with caller identity.
 * Defaults `callerExtId` to `targetExtId` for same-extension calls.
 */
export async function invokeExtensionIpc<T = unknown>(
  targetExtId: string,
  channel: string,
  payload?: unknown,
  callerExtId?: string
): Promise<T> {
  const ipc = window.core?.ipc
  if (!ipc?.invoke) throw new Error('IPC not available')
  const res = (await ipc.invoke(targetExtId, channel, payload, {
    callerExtId: callerExtId ?? targetExtId,
  })) as { success: boolean; data?: T; error?: string } | null
  if (!res?.success) throw new Error(res?.error ?? 'IPC call failed')
  return res.data as T
}
