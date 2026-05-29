import React from 'react'



type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'


type TextVariant = 'default' | 'muted' | 'accent' | 'danger' | 'success'


type TextAs = 'p' | 'span' | 'div' | 'label' | 'small' | 'strong' | 'em'



export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextAs
  size?: TextSize
  variant?: TextVariant
  bold?: boolean
  mono?: boolean
}

export function Text(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Text || (() => null);
  return <Impl {...props} />;
}

