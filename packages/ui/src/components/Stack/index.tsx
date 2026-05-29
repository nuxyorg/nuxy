import React from 'react'



type Align = 'start' | 'center' | 'end' | 'stretch'


type Justify = 'start' | 'center' | 'end' | 'between'



export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal'
  gap?: number | string
  align?: Align
  justify?: Justify
  wrap?: boolean
}

export function Stack(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Stack || (() => null);
  return <Impl {...props} />;
}

