import React from 'react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  placement?: TooltipPlacement
  className?: string
}

export function Tooltip(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Tooltip || (() => null)
  return <Impl {...props} />
}
