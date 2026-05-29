import React from 'react'



export interface DropdownItemProps {
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  children: React.ReactNode
  className?: string
}



export interface DropdownHeaderProps {
  children: React.ReactNode
}



export interface DropdownMenuProps {
  trigger: React.ReactElement
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownItem(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.DropdownItem || (() => null);
  return <Impl {...props} />;
}

export function DropdownDivider(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.DropdownDivider || (() => null);
  return <Impl {...props} />;
}

export function DropdownHeader(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.DropdownHeader || (() => null);
  return <Impl {...props} />;
}

export function DropdownMenu(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.DropdownMenu || (() => null);
  return <Impl {...props} />;
}

