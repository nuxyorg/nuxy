import { h } from '../../h'
import './nuxy-text.ts'

type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type TextVariant = 'default' | 'muted' | 'accent' | 'danger' | 'success'
type TextAs = 'p' | 'span' | 'div' | 'label' | 'small' | 'strong' | 'em'

export interface TextProps extends Record<string, unknown> {
  as?: TextAs
  size?: TextSize
  variant?: TextVariant
  bold?: boolean
  mono?: boolean
}

export function Text({
  as: Tag = 'p',
  size = 'md',
  variant = 'default',
  bold,
  mono,
  className,
  children,
  ...props
}: TextProps) {
  return h(
    'nuxy-text',
    {
      ...props,
      class: className,
      as: Tag,
      size,
      variant,
      ...(bold ? { bold: '' } : {}),
      ...(mono ? { mono: '' } : {}),
    },
    children
  )
}
