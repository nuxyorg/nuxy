import type { CoreContext } from '@nuxyorg/extension-sdk'

/** Maps yt-dlp network flags to curl equivalents for thumbnail fetches. */
export function networkFlagsForCurl(extraArgs: string[]): string[] {
  const flags: string[] = []
  for (let i = 0; i < extraArgs.length; i++) {
    const arg = extraArgs[i]
    if (arg === '-4' || arg === '--force-ipv4') {
      if (!flags.includes('-4')) flags.push('-4')
    } else if (arg === '-6' || arg === '--force-ipv6') {
      if (!flags.includes('-6')) flags.push('-6')
    } else if (arg === '--no-check-certificate') {
      flags.push('-k')
    } else if (arg === '--proxy' && i + 1 < extraArgs.length) {
      flags.push('--proxy', extraArgs[++i])
    }
  }
  return flags
}

export function mimeFromImageBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return 'image/gif'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return 'application/octet-stream'
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

/**
 * When extra yt-dlp args include network flags (e.g. `-4`), fetches the thumbnail
 * in the backend via curl so Electron does not load the remote URL directly.
 */
export async function resolveThumbnailUrl(
  core: CoreContext,
  url: string | null,
  extraArgs: string[]
): Promise<string | null> {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('data:')) return trimmed

  const networkFlags = networkFlagsForCurl(extraArgs)
  if (networkFlags.length === 0) return trimmed

  const tmpPath = `${core.fs.tmpdir()}/nuxy-vd-thumb-${crypto.randomUUID()}`
  const curlArgs = ['-fsSL', '--max-time', '15', '-o', tmpPath, ...networkFlags, trimmed]

  try {
    const { code } = await core.shell.exec('curl', curlArgs)
    if (code !== 0) return trimmed
    if (!(await core.fs.fileExists(tmpPath))) return trimmed

    const bytes = await core.fs.readFileBinary(tmpPath)
    await core.fs.rm(tmpPath).catch(() => {})
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return trimmed

    const mime = mimeFromImageBytes(bytes)
    if (mime === 'application/octet-stream') return trimmed

    return `data:${mime};base64,${bytesToBase64(bytes)}`
  } catch {
    await core.fs.rm(tmpPath).catch(() => {})
    return trimmed
  }
}
