import React from 'react'

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
}

export const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>((props, ref) => {
  const Impl = (window.UI as any)?.SectionHeader || (() => null)
  return <Impl ref={ref} {...props} />
})
SectionHeader.displayName = 'SectionHeader'
