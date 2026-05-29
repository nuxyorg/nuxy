import React from 'react'

export type ListItemBodyProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemBody(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ListItemBody || (() => null)
  return <Impl {...props} />
}
