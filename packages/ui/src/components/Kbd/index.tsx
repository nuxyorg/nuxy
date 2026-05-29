import React from 'react'

export type KbdProps = React.HTMLAttributes<HTMLElement>

export function Kbd(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Kbd || (() => null)
  return <Impl {...props} />
}
