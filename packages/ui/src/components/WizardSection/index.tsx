
export interface WizardSectionProps {
  icon?: unknown
  title: string
}

export function WizardSection(...args: any[]): unknown {
  return (window.UI as any)?.WizardSection?.(...args) ?? null
}
