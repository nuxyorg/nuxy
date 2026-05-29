import React from 'react'

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number // e.g. 16/9, 4/3, 1
  children: React.ReactNode
}

export function AspectRatio({ ratio = 1, children, style, ...props }: AspectRatioProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingBottom: `${100 / ratio}%`,
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
