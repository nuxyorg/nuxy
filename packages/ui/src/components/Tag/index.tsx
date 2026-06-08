
export interface TagProps {
  children: unknown
  onRemove?: () => void
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  className?: string
}

export function Tag(...args: any[]): unknown {
  return (window.UI as any)?.Tag?.(...args) ?? null
}

export { Tag as Chip }
