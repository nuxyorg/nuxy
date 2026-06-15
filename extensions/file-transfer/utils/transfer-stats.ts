import type { TransferProgress } from '../types.ts'

export const CHUNK_SIZE = 64 * 1024

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  const value = bytes / Math.pow(k, i)
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${sizes[i]}`
}

export function formatSpeed(bps: number): string {
  if (bps <= 0) return '0 B/s'
  return `${formatBytes(bps)}/s`
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.ceil(seconds % 60)
  return `${mins}m ${secs}s`
}

export function createProgress(
  bytesTransferred: number,
  totalBytes: number,
  speedBps: number
): TransferProgress {
  const remaining = Math.max(0, totalBytes - bytesTransferred)
  const etaSeconds = speedBps > 0 ? remaining / speedBps : null
  return {
    bytesTransferred,
    totalBytes,
    speedBps,
    etaSeconds,
  }
}

export class SpeedTracker {
  private lastBytes = 0
  private lastTime = 0
  private speedBps = 0

  reset(): void {
    this.lastBytes = 0
    this.lastTime = 0
    this.speedBps = 0
  }

  update(bytesTransferred: number, now = Date.now()): number {
    if (this.lastTime === 0) {
      this.lastBytes = bytesTransferred
      this.lastTime = now
      return 0
    }
    const dt = (now - this.lastTime) / 1000
    if (dt < 0.25) return this.speedBps
    const delta = bytesTransferred - this.lastBytes
    this.speedBps = delta > 0 ? delta / dt : 0
    this.lastBytes = bytesTransferred
    this.lastTime = now
    return this.speedBps
  }
}
