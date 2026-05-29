import React from 'react'

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  display?: React.CSSProperties['display']
  padding?: number | string
  margin?: number | string
  gap?: number | string
  flex?: React.CSSProperties['flex']
}

export function Box({ as: Tag = 'div', display, padding, margin, gap, flex, style, className, ...props }: BoxProps) {
  const toPx = (v: number | string | undefined) =>
    v !== undefined ? (typeof v === 'number' ? `${v}px` : v) : undefined

  return (
    <Tag
      className={`nuxy-box ${className || ''}`}
      style={{ display, padding: toPx(padding), margin: toPx(margin), gap: toPx(gap), flex, ...style }}
      {...props}
    />
  )
}
