import React from 'react'



export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  className?: string
}

export function SearchInput(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.SearchInput || (() => null);
  return <Impl {...props} />;
}

