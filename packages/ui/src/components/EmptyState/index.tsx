
export interface EmptyStateProps extends Record<string, unknown> {
  title?: unknown
  message?: unknown
  hint?: unknown
  error?: unknown
  page?: boolean
}

export function EmptyState(...args: unknown[]): unknown {
  return (window.UI as { EmptyState?: (...a: unknown[]) => unknown })?.EmptyState?.(...args) ?? null
}
