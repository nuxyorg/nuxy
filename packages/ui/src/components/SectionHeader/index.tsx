import React from 'react'



export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
}

export function SectionHeader(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.SectionHeader || (() => null);
  return <Impl {...props} />;
}

