
export interface ButtonProps extends Record<string, unknown> {
  variant?: string
}

export function Button(...args: any[]): unknown {
  return (window.UI as any)?.Button?.(...args) ?? null
}
