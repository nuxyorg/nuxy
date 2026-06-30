/**
 * Splits a raw, user-provided yt-dlp argument string into individual argv
 * tokens. Honours single/double quotes (so values containing spaces stay
 * intact) and backslash escapes, mirroring basic POSIX shell word splitting.
 *
 * The resulting tokens are handed straight to `core.shell.spawn` as argv — no
 * shell is involved — so shell metacharacters carry no special meaning and
 * cannot inject extra commands.
 */
export function parseExtraArgs(raw: string | null | undefined): string[] {
  if (!raw) return []

  const tokens: string[] = []
  let current = ''
  let inToken = false
  let quote: '"' | "'" | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]

    if (quote) {
      if (ch === quote) {
        quote = null
      } else if (ch === '\\' && quote === '"' && i + 1 < raw.length) {
        current += raw[++i]
      } else {
        current += ch
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      inToken = true
      continue
    }

    if (ch === '\\' && i + 1 < raw.length) {
      current += raw[++i]
      inToken = true
      continue
    }

    if (/\s/.test(ch)) {
      if (inToken) {
        tokens.push(current)
        current = ''
        inToken = false
      }
      continue
    }

    current += ch
    inToken = true
  }

  if (inToken) tokens.push(current)
  return tokens
}
