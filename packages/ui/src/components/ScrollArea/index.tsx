import React from 'react'



export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  axis?: 'both' | 'y' | 'x'
  maxHeight?: number | string
  maxWidth?: number | string
}

export function ScrollArea(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ScrollArea || (() => null);
  return <Impl {...props} />;
}

