/**
 * Deeplink IPC contract.
 *
 * URL shape: `nuxy://<extension-id>/<path>?<query>`
 *   - `nuxy://settings/extension/nyaa` → extensionId="settings", path="extension/nyaa"
 *   - `nuxy://download-manager/add?url=https://example.com/file.iso`
 *       → extensionId="download-manager", path="add", query={ url: "..." }
 *
 * Main process parses the URL (`src/electron/deeplink/parse.ts`) and dispatches
 * a `deeplink:open` IPC event to the renderer (`src/electron/deeplink/dispatch.ts`)
 * carrying this payload. The renderer shell (`extensions/shell`) listens for it,
 * activates/mounts the target tool if needed, then forwards `path`/`query` to it.
 */
export interface DeeplinkPayload {
  /** Resolved extension id (manifest.id), already validated against the live registry. */
  extensionId: string
  /** Path segment(s) after the extension id, without leading slash, e.g. "extension/nyaa". */
  path: string
  /** Parsed query-string parameters, e.g. { url: "https://..." }. */
  query: Record<string, string>
}

/** Result of attempting to parse a raw `nuxy://...` URL string, before registry resolution. */
export interface ParsedDeeplink {
  /** Extension id as written in the URL host segment (not yet validated against the registry). */
  extensionId: string
  path: string
  query: Record<string, string>
}

/**
 * Manifest field declaring which deeplink paths an extension accepts as a target,
 * e.g.:
 * ```json
 * "deeplinks": { "schemes": ["add", "extension/:extId"] }
 * ```
 * Path segments prefixed with `:` are named parameters and match any single
 * path segment. `schemes` is advisory/documentation + validation at dispatch
 * time — dispatch only warns (does not block) when no declared scheme matches,
 * so extensions can still handle freeform paths.
 */
export interface ExtensionDeeplinkConfig {
  schemes: string[]
}

/** IPC channel name the main process uses to push a resolved deeplink to the renderer. */
export const DEEPLINK_OPEN_CHANNEL = 'deeplink:open' as const
