
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps extends Record<string, unknown> {
  level?: HeadingLevel
  as?: `h${HeadingLevel}`
}

export function Heading(...args: any[]): unknown {
  return (window.UI as any)?.Heading?.(...args) ?? null
}
