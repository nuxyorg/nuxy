import React from 'react'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export interface HelperTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'error' | 'success'
}

export function Label(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Label || (() => null)
  return <Impl {...props} />
}

export function HelperText(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.HelperText || (() => null)
  return <Impl {...props} />
}
