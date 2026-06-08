
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: unknown
  children: unknown
  placement?: TooltipPlacement
  className?: string
}

export function Tooltip(...args: any[]): unknown {
  return (window.UI as any)?.Tooltip?.(...args) ?? null
}
