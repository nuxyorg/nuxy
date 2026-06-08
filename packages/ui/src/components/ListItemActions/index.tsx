
export type ListItemActionsProps = unknown

export function ListItemActions(...args: any[]): unknown {
  return (window.UI as any)?.ListItemActions?.(...args) ?? null
}
