import React from 'react'
import '../ProgressBar/index.css'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
  variant?: 'rect' | 'text' | 'circle'
}

export function Skeleton({
  width,
  height,
  variant = 'rect',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={[
        'nuxy-skeleton',
        variant === 'text' ? 'nuxy-skeleton--text' : '',
        variant === 'circle' ? 'nuxy-skeleton--circle' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height:
          height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}
