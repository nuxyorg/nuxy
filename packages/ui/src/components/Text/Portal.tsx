
export interface PortalProps {
  children: unknown
  container?: HTMLElement
}

export function Portal(...args: any[]): unknown {
  return (window.UI as any)?.Portal?.(...args) ?? null
}
