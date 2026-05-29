import React from 'react'



export interface ListItemTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success'
}

export function ListItemText(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ListItemText || (() => null);
  return <Impl {...props} />;
}

