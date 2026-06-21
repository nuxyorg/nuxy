/* cspell:ignore angrysearch */
/**
 * Normalizes a settings `type: "list"` field value to a string array.
 * Accepts the new JSON-array shape as well as a legacy comma-separated
 * string (e.g. angrysearch's old `ignoredRoots`), so existing users don't
 * lose their saved value when a field switches from text to list.
 */
export function parseListFieldValue(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}
