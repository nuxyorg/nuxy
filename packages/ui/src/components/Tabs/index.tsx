import React from 'react'

export interface TabItem {
  id: string
  label: React.ReactNode
  content: React.ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeId?: string
  defaultActiveId?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Tabs || (() => null)
  return <Impl {...props} />
}
