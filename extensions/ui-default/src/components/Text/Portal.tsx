import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-portal.ts'

export interface PortalProps {
  children: UiChild
  container?: HTMLElement
}

export function Portal({ children, container }: PortalProps) {
  return h(
    'nuxy-portal',
    {
      ...(container?.id ? { container: container.id } : {}),
    },
    children
  )
}
