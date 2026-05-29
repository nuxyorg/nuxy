import React from 'react'



export interface BreadcrumbItem {
  label: React.ReactNode
  href?: string
  onClick?: (e: React.MouseEvent) => void
}



export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export function Breadcrumb(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Breadcrumb || (() => null);
  return <Impl {...props} />;
}

