
export interface LabelProps extends Record<string, unknown> {
  required?: boolean
}

export interface HelperTextProps extends Record<string, unknown> {
  variant?: 'default' | 'error' | 'success'
}

export function Label(...args: any[]): unknown {
  return (window.UI as any)?.Label?.(...args) ?? null
}

export function HelperText(...args: any[]): unknown {
  return (window.UI as any)?.HelperText?.(...args) ?? null
}
