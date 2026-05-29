import React from 'react'



export interface CalloutProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  title?: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function Callout(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Callout || (() => null);
  return <Impl {...props} />;
}

