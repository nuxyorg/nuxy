import React from 'react'

export interface ItemLeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ItemLeading(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ItemLeading || (() => null)
  return <Impl {...props} />
}
