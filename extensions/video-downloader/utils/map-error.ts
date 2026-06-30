const TECHNICAL_PATTERNS = [
  /cannot read propert/i,
  /is not a function/i,
  /unexpected token/i,
  /unexpected end of json/i,
  /json\.parse/i,
  /^typeerror:/i,
  /^syntaxerror:/i,
]

export function isTechnicalErrorMessage(message: string): boolean {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message))
}

/** Maps raw IPC / runtime failures to user-facing i18n strings. */
export function mapVideoDownloaderError(err: unknown, t: (key: string) => string): string {
  if (!(err instanceof Error)) return t('errors.generic')

  const msg = err.message.trim()
  if (!msg) return t('errors.generic')

  const notInstalledMsg = t('install.notInstalled')
  if (
    msg.includes('yt-dlp is not installed') ||
    /(?:spawn|exec(?:file)?)\s+yt-dlp\b.*\benoent\b/i.test(msg) ||
    msg === notInstalledMsg
  ) {
    return notInstalledMsg
  }

  if (isTechnicalErrorMessage(msg)) {
    return t('errors.fetchFailed')
  }

  return msg
}
