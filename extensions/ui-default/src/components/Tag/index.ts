export interface TagProps {
  children: unknown
  onRemove?: () => void
  variant?: 'default' | 'blue' | 'green' | 'orange' | 'red'
  className?: string
}
