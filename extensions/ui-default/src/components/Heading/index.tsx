import React from 'react'
import '../Text/index.css'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel
  as?: `h${HeadingLevel}`
}

export function Heading({ level = 2, as, className, ...props }: HeadingProps) {
  const Tag = (as ?? `h${level}`) as React.ElementType
  return <Tag className={`nuxy-heading nuxy-heading--${level} ${className || ''}`} {...props} />
}
