import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-avatar.ts'
import './nuxy-avatar-group.ts'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline'

export interface AvatarProps {
  src?: string
  name?: string
  size?: AvatarSize
  variant?: 'circle' | 'square'
  status?: AvatarStatus
  className?: string
}

export function Avatar({
  src,
  name = '',
  size = 'md',
  variant = 'circle',
  status,
  className,
}: AvatarProps) {
  return h('nuxy-avatar', {
    class: className,
    size,
    variant,
    ...(src ? { src } : {}),
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
  })
}

export interface AvatarGroupProps {
  children: UiChild
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({ children, max = 5, size = 'md', className }: AvatarGroupProps) {
  return h(
    'nuxy-avatar-group',
    {
      max: String(max),
      size,
      class: className,
    },
    children
  )
}
