import React from 'react'



export type ListItemMetaProps = React.HTMLAttributes<HTMLDivElement>

export function ListItemMeta(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ListItemMeta || (() => null);
  return <Impl {...props} />;
}

