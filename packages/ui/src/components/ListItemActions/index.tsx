import React from 'react'

export type ListItemActionsProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemActions(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ListItemActions || (() => null)
  return <Impl {...props} />
}
