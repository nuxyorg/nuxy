import React from 'react'
import './index.css'

export interface NumberInputProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function NumberInput({
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  className,
  id,
}: NumberInputProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : internalValue

  const update = (next: number) => {
    if (min !== undefined && next < min) next = min
    if (max !== undefined && next > max) next = max
    if (!isControlled) setInternalValue(next)
    onChange?.(next)
  }

  return (
    <div className={`nuxy-number-input ${className || ''}`}>
      <button
        type="button"
        className="nuxy-number-input__btn"
        onClick={() => update(current - step)}
        disabled={disabled || (min !== undefined && current <= min)}
        aria-label="Decrease"
      >
        −
      </button>
      <input
        id={id}
        type="number"
        className="nuxy-number-input__field"
        value={current}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => update(Number(e.target.value))}
      />
      <button
        type="button"
        className="nuxy-number-input__btn"
        onClick={() => update(current + step)}
        disabled={disabled || (max !== undefined && current >= max)}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
