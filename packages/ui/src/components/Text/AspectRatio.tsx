import React from 'react'



export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number // e.g. 16/9, 4/3, 1
  children: React.ReactNode
}

export function AspectRatio(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.AspectRatio || (() => null);
  return <Impl {...props} />;
}

