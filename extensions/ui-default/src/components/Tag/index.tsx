import type { UiChild } from '../../types'
import { host } from '../../host'
import './nuxy-tag.ts'

export interface TagProps {
  children: UiChild
  onRemove?: () => void
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  className?: string
}

export function Tag({ children, onRemove, variant = 'default', className }: TagProps): HTMLElement {
  const listeners: Record<string, EventListener> = {}
  if (onRemove) {
    listeners['nuxy-tag-remove'] = () => onRemove()
  }
  return host(
    'nuxy-tag',
    {
      class: className,
      variant,
      ...(onRemove ? { removable: '' } : {}),
    },
    listeners,
    children
  )
}

export { Tag as Chip }
