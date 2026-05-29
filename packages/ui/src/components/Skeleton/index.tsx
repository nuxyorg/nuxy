import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
  variant?: 'rect' | 'text' | 'circle'
}

export function Skeleton(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Skeleton || (() => null)
  return <Impl {...props} />
}
