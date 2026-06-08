
type Align = 'start' | 'center' | 'end' | 'stretch'

type Justify = 'start' | 'center' | 'end' | 'between'

export interface StackProps extends Record<string, unknown> {
  direction?: 'vertical' | 'horizontal'
  gap?: number | string
  align?: Align
  justify?: Justify
  wrap?: boolean
}

export function Stack(...args: any[]): unknown {
  return (window.UI as any)?.Stack?.(...args) ?? null
}
