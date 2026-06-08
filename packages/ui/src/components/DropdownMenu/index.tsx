
export interface DropdownItemProps {
  onClick?: (e: unknown) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  children: unknown
  className?: string
}

export interface DropdownHeaderProps {
  children: unknown
}

export interface DropdownMenuProps {
  trigger: unknown
  children: unknown
  align?: 'left' | 'right'
  className?: string
}

export function DropdownItem(...args: any[]): unknown {
  return (window.UI as any)?.DropdownItem?.(...args) ?? null
}

export function DropdownDivider(...args: any[]): unknown {
  return (window.UI as any)?.DropdownDivider?.(...args) ?? null
}

export function DropdownHeader(...args: any[]): unknown {
  return (window.UI as any)?.DropdownHeader?.(...args) ?? null
}

export function DropdownMenu(...args: any[]): unknown {
  return (window.UI as any)?.DropdownMenu?.(...args) ?? null
}
