import React from 'react'
import '../Tabs/index.css'

export interface StepItem {
  title: string
  description?: string
}

export interface StepperProps {
  steps: StepItem[]
  current: number // 0-indexed current step
  className?: string
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={`nuxy-stepper ${className || ''}`} aria-label="Progress Stepper">
      {steps.map((step, idx) => {
        const isActive = idx === current
        const isCompleted = idx < current
        const isLast = idx === steps.length - 1

        return (
          <div
            key={step.title}
            className={[
              'nuxy-step',
              isActive ? 'nuxy-step--active' : '',
              isCompleted ? 'nuxy-step--completed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="nuxy-step__indicator">
              {isCompleted ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span className="nuxy-step__label">{step.title}</span>
            {!isLast && <div className="nuxy-step__line" />}
          </div>
        )
      })}
    </div>
  )
}
