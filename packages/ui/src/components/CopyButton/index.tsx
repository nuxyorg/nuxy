
export interface CopyButtonProps {
  value: string
  label?: string
  copiedLabel?: string
  timeout?: number
  className?: string
}

export function CopyButton(...args: any[]): unknown {
  return (window.UI as any)?.CopyButton?.(...args) ?? null
}
