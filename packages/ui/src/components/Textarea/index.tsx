import React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Textarea || (() => null)
  return <Impl {...props} />
}
