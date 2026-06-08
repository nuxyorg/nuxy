import { h } from '../../h'
import './nuxy-badge.ts'

export interface BadgeProps extends Record<string, unknown> {
  active?: boolean
}

export function Badge({ children, active, className, ...props }: BadgeProps) {
  return h(
    'nuxy-badge',
    { ...props, class: className, ...(active ? { active: '' } : {}) },
    children
  )
}
