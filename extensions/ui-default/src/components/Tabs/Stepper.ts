export interface StepItem {
  title: string
  description?: string
}
export interface StepperProps {
  steps: StepItem[]
  current: number
  className?: string
}
