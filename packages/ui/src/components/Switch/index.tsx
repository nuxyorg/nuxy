import React from 'react'



export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: React.ReactNode
  id?: string
  className?: string
}

export function Switch(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Switch || (() => null);
  return <Impl {...props} />;
}

