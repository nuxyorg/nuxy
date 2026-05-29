import React from 'react'

export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Divider || (() => null)
  return <Impl {...props} />
}
