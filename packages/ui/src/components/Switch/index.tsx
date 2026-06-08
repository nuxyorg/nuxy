
export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: unknown
  id?: string
  className?: string
}

export function Switch(...args: any[]): unknown {
  return (window.UI as any)?.Switch?.(...args) ?? null
}
