
export interface BadgeProps extends Record<string, unknown> {
  active?: boolean
}

export function Badge(...args: any[]): unknown {
  return (window.UI as any)?.Badge?.(...args) ?? null
}
