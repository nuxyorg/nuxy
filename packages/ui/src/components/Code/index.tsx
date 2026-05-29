import React from 'react'



export interface CodeProps extends React.HTMLAttributes<HTMLElement> {}



export interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}

export function Code(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Code || (() => null);
  return <Impl {...props} />;
}

export function CodeBlock(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CodeBlock || (() => null);
  return <Impl {...props} />;
}

