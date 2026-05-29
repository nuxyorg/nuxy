import React from 'react'
import './index.css'

type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type TextVariant = 'default' | 'muted' | 'accent' | 'danger' | 'success'
type TextAs = 'p' | 'span' | 'div' | 'label' | 'small' | 'strong' | 'em'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextAs
  size?: TextSize
  variant?: TextVariant
  bold?: boolean
  mono?: boolean
}

export function Text({ as: Tag = 'p', size = 'md', variant = 'default', bold, mono, className, ...props }: TextProps) {
  const classes = [
    'nuxy-text',
    `nuxy-text--${size}`,
    variant !== 'default' ? `nuxy-text--${variant}` : '',
    bold ? 'nuxy-text--bold' : '',
    mono ? 'nuxy-text--mono' : '',
    className || '',
  ].filter(Boolean).join(' ')
  // @ts-ignore dynamic tag
  return <Tag className={classes} {...props} />
}
