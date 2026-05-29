import React from 'react'



export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number
  className?: string
  'aria-label'?: string
}

export function Spinner(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Spinner || (() => null);
  return <Impl {...props} />;
}

