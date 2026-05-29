import React from 'react'

export interface TagProps {
  children: React.ReactNode
  onRemove?: () => void
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  className?: string
}

export function Tag(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Tag || (() => null);
  return <Impl {...props} />;
}

export { Tag as Chip }
