import React from 'react'



export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean
}

export function Badge(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Badge || (() => null);
  return <Impl {...props} />;
}

