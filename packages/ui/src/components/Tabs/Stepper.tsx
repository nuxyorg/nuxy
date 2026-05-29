import React from 'react'



export interface StepItem {
  title: string
  description?: string
}



export interface StepperProps {
  steps: StepItem[]
  current: number // 0-indexed current step
  className?: string
}

export function Stepper(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Stepper || (() => null);
  return <Impl {...props} />;
}

