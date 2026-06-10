export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export interface TooltipProps {
  content: unknown
  children: unknown
  placement?: TooltipPlacement
  className?: string
}
