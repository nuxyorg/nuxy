import React from 'react'



export interface PinInputProps {
  length?: number
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  mask?: boolean
  className?: string
}

export function PinInput(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.PinInput || (() => null);
  return <Impl {...props} />;
}

