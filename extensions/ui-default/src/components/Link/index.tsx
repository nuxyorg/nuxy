import { h } from '../../h'
import './nuxy-link.ts'

export interface LinkProps extends Record<string, unknown> {
  variant?: 'default' | 'muted'
  external?: boolean
}

export function Link({ variant = 'default', external, className, children, href, ...props }: LinkProps) {
  return h(
    'nuxy-link',
    {
      ...props,
      class: className,
      variant,
      ...(href ? { href } : {}),
      ...(external ? { external: '' } : {}),
    },
    children
  )
}
