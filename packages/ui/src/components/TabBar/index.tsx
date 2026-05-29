import React, { useRef, useEffect } from 'react'



export interface TabOption {
  id: string
  label: string
  icon?: string
}



export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabOption[]
  active: string
  onChange: (id: string) => void
  orientation?: 'horizontal' | 'vertical'
}

export function TabBar(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.TabBar || (() => null);
  return <Impl {...props} />;
}

