import React from 'react'

export interface WizardSectionProps {
  icon?: React.ReactNode
  title: string
}

export function WizardSection(props: WizardSectionProps): React.ReactElement {
  const Impl = (window.UI as any)?.WizardSection || (() => null)
  return <Impl {...props} />
}
