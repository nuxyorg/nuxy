import React from 'react'

export interface VisuallyHiddenProps {
  children: React.ReactNode
}

export function VisuallyHidden(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.VisuallyHidden || (() => null)
  return <Impl {...props} />
}
