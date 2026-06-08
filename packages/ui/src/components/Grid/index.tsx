
export interface GridProps extends Record<string, unknown> {
  cols?: number
  gap?: number
}

export interface GridItemProps extends Record<string, unknown> {
  active?: boolean
  title?: string
}

export function Grid(...args: any[]): unknown {
  return (window.UI as any)?.Grid?.(...args) ?? null
}

export function GridItem(...args: any[]): unknown {
  return (window.UI as any)?.GridItem?.(...args) ?? null
}
