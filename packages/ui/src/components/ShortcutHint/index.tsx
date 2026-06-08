
export type ShortcutHintProps = unknown

export function ShortcutHint(...args: any[]): unknown {
  return (window.UI as any)?.ShortcutHint?.(...args) ?? null
}

export function ShortcutSep(...args: any[]): unknown {
  return (window.UI as any)?.ShortcutSep?.(...args) ?? null
}
