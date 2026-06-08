
export interface AlertProps extends Record<string, unknown> {
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

export function Alert(...args: any[]): unknown {
  return (window.UI as any)?.Alert?.(...args) ?? null
}
