export interface DropdownItemProps {
  onClick?: (e: MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  children: unknown
  className?: string
}
export interface DropdownHeaderProps {
  children: unknown
}
export interface DropdownMenuProps {
  trigger: HTMLElement
  children: unknown
  align?: 'left' | 'right'
  className?: string
}
