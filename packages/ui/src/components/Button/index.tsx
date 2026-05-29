import React from 'react'



export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string
}

export function Button(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Button || (() => null);
  return <Impl {...props} />;
}

