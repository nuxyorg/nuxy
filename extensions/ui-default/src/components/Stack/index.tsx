import React from 'react'
import './index.css'

type Align = 'start' | 'center' | 'end' | 'stretch'
type Justify = 'start' | 'center' | 'end' | 'between'

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  gap?: number | string
  align?: Align
  justify?: Justify
  wrap?: boolean
}

export function Stack({
  direction = 'vertical',
  gap,
  align,
  justify,
  wrap,
  className,
  style,
  children,
  ...props
}: StackProps) {
  const classes = [
    'nuxy-stack',
    `nuxy-stack--${direction}`,
    align ? `nuxy-stack--align-${align}` : '',
    justify ? `nuxy-stack--justify-${justify}` : '',
    wrap ? 'nuxy-stack--wrap' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      style={{
        gap: gap !== undefined ? (typeof gap === 'number' ? `${gap}px` : gap) : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
