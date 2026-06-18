import type { ExtensionDeeplinkConfig } from '@nuxyorg/core'

export type DeeplinkConfigValidation = { ok: true } | { ok: false; error: string }

/**
 * Validates the optional `manifest.deeplinks` field:
 * ```json
 * "deeplinks": { "schemes": ["add", "extension/:extId"] }
 * ```
 * `schemes` entries are path templates matched against the `path` segment of
 * a `nuxy://<extension-id>/<path>` URL (after the host). Segments prefixed
 * with `:` are named parameters. Entries must not start with a leading slash
 * — paths are always relative to the extension id.
 */
export function validateDeeplinksConfig(
  deeplinks: ExtensionDeeplinkConfig | undefined
): DeeplinkConfigValidation {
  if (deeplinks === undefined) return { ok: true }

  if (typeof deeplinks !== 'object' || deeplinks === null || Array.isArray(deeplinks)) {
    return { ok: false, error: '"deeplinks" must be an object' }
  }

  if (!Array.isArray(deeplinks.schemes)) {
    return { ok: false, error: '"deeplinks.schemes" must be an array of strings' }
  }

  for (const scheme of deeplinks.schemes) {
    if (typeof scheme !== 'string') {
      return { ok: false, error: `"deeplinks.schemes" entry is not a string: ${String(scheme)}` }
    }
    if (scheme.startsWith('/')) {
      return {
        ok: false,
        error: `"deeplinks.schemes" entry must not start with "/": "${scheme}"`,
      }
    }
  }

  return { ok: true }
}
