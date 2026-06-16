import type { IpcResult } from '@nuxyorg/core'
import { getExtensionById, isChannelAllowed } from '../extensions/registry.js'
import { invokeWorker } from './worker-invoke.js'
import { callKernelChannel } from './kernel-invokable.js'

export async function invokeExtension(
  callerId: string,
  targetId: string,
  channel: string,
  payload: unknown
): Promise<IpcResult> {
  const caller = getExtensionById(callerId)
  if (!caller) {
    return {
      success: false,
      error: `Caller extension not found: ${callerId}`,
      code: 'EXTENSION_NOT_FOUND',
    }
  }

  if (!caller.manifest.capabilities?.caller) {
    return {
      success: false,
      error: 'Caller lacks caller capability',
      code: 'CALLER_DENIED',
    }
  }

  // Route kernel channels directly — kernel is not a worker extension
  if (targetId === 'kernel') {
    const kernelResult = await callKernelChannel(channel, payload)
    // Wrap so host-handlers extracts kernelResult as the data;
    // the worker caller then receives kernelResult via core.extensions.invoke,
    // preserving the same { success, data, error } shape the renderer sees.
    return { success: true, data: kernelResult }
  }

  const target = getExtensionById(targetId)
  if (!target) {
    return {
      success: false,
      error: `Target extension not found: ${targetId}`,
      code: 'EXTENSION_NOT_FOUND',
    }
  }

  if (!target.manifest.capabilities?.callable) {
    return {
      success: false,
      error: 'Target is not callable',
      code: 'CALLABLE_DENIED',
    }
  }

  if (!isChannelAllowed(targetId, channel)) {
    return {
      success: false,
      error: `Unknown channel: ${channel}`,
      code: 'UNKNOWN_CHANNEL',
    }
  }

  return invokeWorker(targetId, channel, payload)
}
