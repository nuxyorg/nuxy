import React from 'react'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, React.RefAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg'
}

export function Input(props: InputProps): React.ReactElement {
  const Impl = (window.UI as any)?.Input || (() => null)
  return <Impl {...props} />
}
