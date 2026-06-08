
export interface TwoPanelProps extends Record<string, unknown> {
  left: unknown
  right: unknown
  split?: string
}

export function TwoPanel(...args: any[]): unknown {
  return (window.UI as any)?.TwoPanel?.(...args) ?? null
}
