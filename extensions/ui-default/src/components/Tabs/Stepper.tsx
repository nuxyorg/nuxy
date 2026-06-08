import { h } from '../../h'
import './nuxy-stepper.ts'

export interface StepItem {
  title: string
  description?: string
}

export interface StepperProps {
  steps: StepItem[]
  current: number
  className?: string
}

export function Stepper({ steps, current, className }: StepperProps) {
  return h('nuxy-stepper', {
    steps: JSON.stringify(steps),
    current: String(current),
    class: className,
  })
}
