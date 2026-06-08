
export interface SearchInputProps extends Omit<
  unknown,
  'onChange'
> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  className?: string
}

export function SearchInput(...args: any[]): unknown {
  return (window.UI as any)?.SearchInput?.(...args) ?? null
}
