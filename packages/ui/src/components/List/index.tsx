import React from 'react'



export interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: 'md'
}

export function List(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.List || (() => null);
  return <Impl {...props} />;
}

