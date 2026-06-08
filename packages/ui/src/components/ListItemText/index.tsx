
export interface ListItemTextProps extends Record<string, unknown> {
  variant?: 'default' | 'success'
}

export function ListItemText(...args: any[]): unknown {
  return (window.UI as any)?.ListItemText?.(...args) ?? null
}
