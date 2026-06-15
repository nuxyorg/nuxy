import type { ControlMessage, FileDoneMessage, FileMetaMessage } from '../types.ts'

const META_PREFIX = '\x01META:'

export function encodeMetaMessage(meta: FileMetaMessage): string {
  return META_PREFIX + JSON.stringify(meta)
}

export function decodeControlMessage(data: string): ControlMessage | null {
  if (!data.startsWith(META_PREFIX)) return null
  try {
    const parsed = JSON.parse(data.slice(META_PREFIX.length)) as ControlMessage
    if (
      parsed.type === 'meta' &&
      typeof parsed.name === 'string' &&
      typeof parsed.size === 'number'
    ) {
      return parsed
    }
    if (parsed.type === 'done') return parsed as FileDoneMessage
  } catch {
    return null
  }
  return null
}

export function encodeDoneMessage(): string {
  return META_PREFIX + JSON.stringify({ type: 'done' } satisfies FileDoneMessage)
}

export function isBinaryChunk(data: string | ArrayBuffer | Blob): data is ArrayBuffer {
  return data instanceof ArrayBuffer
}
