
export interface ListItemProps extends Record<string, unknown> {
  active?: boolean
  className?: string
}

export function ListItem(...args: any[]): unknown {
  return (window.UI as any)?.ListItem?.(...args) ?? null
}
