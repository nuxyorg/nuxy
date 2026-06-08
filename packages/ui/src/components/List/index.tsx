
export interface ListProps extends Record<string, unknown> {
  maxHeight?: 'md'
}

export function List(...args: any[]): unknown {
  return (window.UI as any)?.List?.(...args) ?? null
}
