
export interface AspectRatioProps extends Record<string, unknown> {
  ratio?: number // e.g. 16/9, 4/3, 1
  children: unknown
}

export function AspectRatio(...args: any[]): unknown {
  return (window.UI as any)?.AspectRatio?.(...args) ?? null
}
