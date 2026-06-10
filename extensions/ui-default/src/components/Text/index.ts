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
