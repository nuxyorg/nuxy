import React from 'react'

export interface PortalProps {
  children: React.ReactNode
  container?: HTMLElement
}

export function Portal(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Portal || (() => null)
  return <Impl {...props} />
}
