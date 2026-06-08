
export interface IconButtonProps extends Record<string, unknown> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  children: unknown
}

export function IconButton(...args: any[]): unknown {
  return (window.UI as any)?.IconButton?.(...args) ?? null
}
