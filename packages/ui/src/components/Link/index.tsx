import React from 'react'



export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'default' | 'muted'
  external?: boolean
}

export function Link(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Link || (() => null);
  return <Impl {...props} />;
}

