import React from 'react'

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  display?: React.CSSProperties['display']
  padding?: number | string
  margin?: number | string
  gap?: number | string
  flex?: React.CSSProperties['flex']
}

export function Box(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Box || (() => null)
  return <Impl {...props} />
}
