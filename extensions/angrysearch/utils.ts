import type { DbStatus } from './types.ts'

export interface EmptyStateContent {
  message: string
  hint?: string
}

const MIN_QUERY_LENGTH = 3

/**
 * Picks which empty-state message to show in priority order: an in-progress
 * or missing index always takes precedence over the plain "type to search"
 * / "no matches" copy, since those would otherwise read as a dead extension.
 */
export function selectEmptyState(
  status: DbStatus | null,
  query: string,
  hasItems: boolean,
  t: (key: string) => string
): EmptyStateContent | null {
  if (hasItems) return null

  if (status?.isUpdating) {
    return { message: t('db.updating') }
  }

  if (status && !status.exists) {
    return { message: t('db.missing') }
  }

  if (query.trim().length < MIN_QUERY_LENGTH) {
    return { message: t('empty.typeToSearch'), hint: t('empty.typeHint') }
  }

  return { message: t('empty.noMatches'), hint: t('empty.noMatchesHint') }
}

/**
 * Normalizes the `ignoredRoots` setting to a string array. Accepts the
 * current JSON-array shape (settings `type: "list"`) as well as the legacy
 * comma-separated string, so existing users keep their ignored directories
 * after the field migrated from text to list.
 */
export function parseIgnoredRoots(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}
