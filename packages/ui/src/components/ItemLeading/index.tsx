
export interface ItemLeadingProps extends Record<string, unknown> {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ItemLeading(...args: any[]): unknown {
  return (window.UI as any)?.ItemLeading?.(...args) ?? null
}
