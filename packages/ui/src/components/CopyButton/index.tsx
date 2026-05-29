import React from 'react'



export interface CopyButtonProps {
  value: string
  label?: string
  copiedLabel?: string
  timeout?: number
  className?: string
}

export function CopyButton(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CopyButton || (() => null);
  return <Impl {...props} />;
}

