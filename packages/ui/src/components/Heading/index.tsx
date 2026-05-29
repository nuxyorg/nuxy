import React from 'react'

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel
  as?: `h${HeadingLevel}`
}

export function Heading(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Heading || (() => null)
  return <Impl {...props} />
}
