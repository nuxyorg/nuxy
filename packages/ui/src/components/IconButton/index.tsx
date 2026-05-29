import React from 'react'



export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  children: React.ReactNode
}

export function IconButton(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.IconButton || (() => null);
  return <Impl {...props} />;
}

