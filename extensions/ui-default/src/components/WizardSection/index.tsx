import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-wizard-section.ts'

export interface WizardSectionProps {
  icon?: UiChild
  title: string
  className?: string
}

export function WizardSection({ icon, title, className }: WizardSectionProps) {
  return h(
    'nuxy-wizard-section',
    {
      title,
      ...(className ? { class: className } : {}),
    },
    icon ?? null
  )
}
