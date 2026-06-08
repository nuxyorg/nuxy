
export type ListItemBodyProps = unknown

export function ListItemBody(...args: any[]): unknown {
  return (window.UI as any)?.ListItemBody?.(...args) ?? null
}
