
export interface CalloutProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: unknown
  icon?: unknown
  className?: string
}

export function Callout(...args: any[]): unknown {
  return (window.UI as any)?.Callout?.(...args) ?? null
}
