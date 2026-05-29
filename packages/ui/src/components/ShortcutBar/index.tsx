import React from 'react'

export type ShortcutBarProps = React.HTMLAttributes<HTMLDivElement>

export function ShortcutBar(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ShortcutBar || (() => null)
  return <Impl {...props} />
}
