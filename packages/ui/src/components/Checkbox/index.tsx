
export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: unknown
  id?: string
  className?: string
}

export function Checkbox(...args: any[]): unknown {
  return (window.UI as any)?.Checkbox?.(...args) ?? null
}
