import React from 'react'

export interface ConversionCardProps {
  from: React.ReactNode
  to: React.ReactNode
  label?: string
}

export function ConversionCard(props: ConversionCardProps): React.ReactElement {
  const Impl = (window.UI as any)?.ConversionCard || (() => null)
  return <Impl {...props} />
}
