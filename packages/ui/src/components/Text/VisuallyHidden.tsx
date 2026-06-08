
export interface VisuallyHiddenProps {
  children: unknown
}

export function VisuallyHidden(...args: any[]): unknown {
  return (window.UI as any)?.VisuallyHidden?.(...args) ?? null
}
