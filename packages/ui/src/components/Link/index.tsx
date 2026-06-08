
export interface LinkProps extends Record<string, unknown> {
  variant?: 'default' | 'muted'
  external?: boolean
}

export function Link(...args: any[]): unknown {
  return (window.UI as any)?.Link?.(...args) ?? null
}
