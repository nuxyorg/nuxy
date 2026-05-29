import React from 'react'
import './index.css'

export interface RadioOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  orientation?: 'vertical' | 'horizontal'
  name?: string
  disabled?: boolean
  className?: string
}

export function RadioGroup({
  options,
  value,
  defaultValue,
  onChange,
  orientation = 'vertical',
  name,
  disabled,
  className,
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '')
  const isControlled = value !== undefined
  const selected = isControlled ? value : internalValue
  const groupName = name ?? React.useId()

  const handleChange = (optValue: string, optDisabled?: boolean) => {
    if (disabled || optDisabled) return
    if (!isControlled) setInternalValue(optValue)
    onChange?.(optValue)
  }

  return (
    <div
      className={`nuxy-radio-group ${orientation === 'horizontal' ? 'nuxy-radio-group--horizontal' : ''} ${className || ''}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isChecked = selected === opt.value
        const isDisabled = disabled || opt.disabled
        return (
          <label
            key={opt.value}
            className={`nuxy-radio ${isChecked ? 'nuxy-radio--checked' : ''} ${isDisabled ? 'nuxy-radio--disabled' : ''}`}
          >
            <input
              type="radio"
              className="nuxy-radio__input"
              name={groupName}
              value={opt.value}
              checked={isChecked}
              disabled={isDisabled}
              onChange={() => handleChange(opt.value, opt.disabled)}
              aria-checked={isChecked}
            />
            <span
              className="nuxy-radio__circle"
              onClick={() => handleChange(opt.value, opt.disabled)}
              aria-hidden="true"
            >
              <span className="nuxy-radio__dot" />
            </span>
            <span>{opt.label}</span>
          </label>
        )
      })}
    </div>
  )
}
