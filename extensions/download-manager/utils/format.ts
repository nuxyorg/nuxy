export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
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
