
export type ListItemMetaProps = unknown

export function ListItemMeta(...args: any[]): unknown {
  return (window.UI as any)?.ListItemMeta?.(...args) ?? null
}
