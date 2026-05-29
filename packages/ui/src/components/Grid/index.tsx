import React, { useRef, useEffect } from 'react'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  gap?: number
}

export interface GridItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  title?: string
}

export function Grid(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Grid || (() => null)
  return <Impl {...props} />
}

export function GridItem(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.GridItem || (() => null)
  return <Impl {...props} />
}
