
export interface InputProps
  extends
    Omit<unknown, 'size'>,
    unknown {
  size?: 'sm' | 'md' | 'lg'
}

export function Input(...args: any[]): unknown {
  return (window.UI as any)?.Input?.(...args) ?? null
}
