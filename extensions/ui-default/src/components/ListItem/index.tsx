import { h } from '../../h'
import './nuxy-list-item.ts'

export interface ListItemProps extends Record<string, unknown> {
  active?: boolean
  className?: string
}

export function ListItem({
  children,
  active,
  className,
  onClick,
  onKeyDown,
  ...props
}: ListItemProps) {
  const interactive = Boolean(onClick)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.(e as unknown as MouseEvent)
    }
    onKeyDown?.(e as unknown as KeyboardEvent)
  }

  return h(
    'nuxy-list-item',
    {
      ...props,
      class: className,
      ...(active ? { active: '' } : {}),
      onClick,
      onKeyDown: interactive ? handleKeyDown : onKeyDown,
      ...(interactive ? { role: 'button', tabIndex: 0 } : {}),
    },
    children
  )
}
