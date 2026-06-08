
export interface SectionHeaderProps extends Record<string, unknown> {
  label: string
  description?: string
  action?: unknown
}

export function SectionHeader(...args: unknown[]): unknown {
  return (window.UI as { SectionHeader?: (...a: unknown[]) => unknown })?.SectionHeader?.(...args) ?? null
}
