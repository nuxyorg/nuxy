import React from 'react'



export interface ProgressBarProps {
  value?: number // 0-100, omit for indeterminate
  max?: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ProgressBar || (() => null);
  return <Impl {...props} />;
}

