
export type KbdProps = unknown

export function Kbd(...args: any[]): unknown {
  return (window.UI as any)?.Kbd?.(...args) ?? null
}
