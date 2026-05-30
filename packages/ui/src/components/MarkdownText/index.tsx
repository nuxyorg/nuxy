import React from 'react'

export interface MarkdownTextProps {
  children: string
  className?: string
}

export function MarkdownText(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.MarkdownText || (() => null)
  return <Impl {...props} />
}
