import React from 'react'



export interface PaginationProps {
  total: number // total items
  current: number // 1-indexed current page
  pageSize?: number
  onChange: (page: number) => void
  siblings?: number
  className?: string
}

export function Pagination(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Pagination || (() => null);
  return <Impl {...props} />;
}

