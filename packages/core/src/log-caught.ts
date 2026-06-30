/** Log an intentionally caught error without rethrowing. */
export function logCaughtError(scope: string, err: unknown, detail?: string): void {
  if (detail !== undefined) {
    console.error(`[${scope}] ${detail}`, err)
  } else {
    console.error(`[${scope}]`, err)
  }
}
