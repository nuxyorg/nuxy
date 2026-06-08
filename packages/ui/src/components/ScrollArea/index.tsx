
export interface ScrollAreaProps extends Record<string, unknown> {
  axis?: 'both' | 'y' | 'x'
  maxHeight?: number | string
  maxWidth?: number | string
}

export function ScrollArea(...args: any[]): unknown {
  return (window.UI as any)?.ScrollArea?.(...args) ?? null
}
