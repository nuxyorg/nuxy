/**
 * Scans a process argv array for a `nuxy://` deeplink URL, used for:
 *  - the initial launch argv (cold start via OS "open with")
 *  - `second-instance` event argv (Linux/Windows, since Nuxy is single-instance)
 *  - explicit `--open=nuxy://...` flag handling
 */
export function findDeeplinkUrlInArgv(argv: string[]): string | undefined {
  for (const arg of argv) {
    if (arg.startsWith('--open=')) {
      const value = arg.slice('--open='.length)
      if (value.startsWith('nuxy://')) return value
      continue
    }
    if (arg.startsWith('nuxy://')) return arg
  }
  return undefined
}
