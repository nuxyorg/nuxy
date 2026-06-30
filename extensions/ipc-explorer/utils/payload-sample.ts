import type { IpcTarget } from './parse-targets.ts'

export function formatPayloadSample(sample: unknown | undefined): string {
  if (sample === undefined) return '{}'
  try {
    return JSON.stringify(sample, null, 2)
  } catch {
    return '{}'
  }
}

export function payloadSampleForChannel(target: IpcTarget | undefined, channel: string): string {
  if (!target || !channel) return '{}'
  return formatPayloadSample(target.ipcSamples[channel])
}
