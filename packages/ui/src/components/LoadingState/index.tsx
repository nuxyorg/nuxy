import React from 'react'

export interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  minHeight?: string
  className?: string
}

export function LoadingState(props: LoadingStateProps): React.ReactElement {
  const Impl = (window.UI as any)?.LoadingState || (() => null)
  return <Impl {...props} />
}
