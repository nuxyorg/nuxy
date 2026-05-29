import React from 'react'



export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: React.ReactNode
  id?: string
  className?: string
}

export function Checkbox(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Checkbox || (() => null);
  return <Impl {...props} />;
}

