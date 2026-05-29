import React from 'react'



export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Modal || (() => null);
  return <Impl {...props} />;
}

