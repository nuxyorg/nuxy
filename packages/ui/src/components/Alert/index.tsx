import React from 'react'



export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

export function Alert(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Alert || (() => null);
  return <Impl {...props} />;
}

