import { h } from '../../h'
import './nuxy-heading.ts'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps extends Record<string, unknown> {
  level?: HeadingLevel
  as?: `h${HeadingLevel}`
}

export function Heading({ level = 2, as, className, children, ...props }: HeadingProps) {
  return h(
    'nuxy-heading',
    {
      ...props,
      class: className,
      level: String(level),
      ...(as ? { as } : {}),
    },
    children
  )
}
