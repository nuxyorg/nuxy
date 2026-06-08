
export interface StepItem {
  title: string
  description?: string
}

export interface StepperProps {
  steps: StepItem[]
  current: number // 0-indexed current step
  className?: string
}

export function Stepper(...args: any[]): unknown {
  return (window.UI as any)?.Stepper?.(...args) ?? null
}
