
export type ShortcutBarProps = unknown

export function ShortcutBar(...args: any[]): unknown {
  return (window.UI as any)?.ShortcutBar?.(...args) ?? null
}
