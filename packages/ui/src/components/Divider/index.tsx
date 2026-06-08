
export interface DividerProps extends Record<string, unknown> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider(...args: any[]): unknown {
  return (window.UI as any)?.Divider?.(...args) ?? null
}
