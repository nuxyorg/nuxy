import React from 'react'
import './index.css'

export interface SliderProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  disabled?: boolean
  showValue?: boolean
  showLabels?: boolean
  className?: string
  id?: string
}

export function Slider({
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  showValue = false,
  showLabels = false,
  className,
  id,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const current = isControlled ? value : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value)
    if (!isControlled) setInternalValue(num)
    onChange?.(num)
  }

  return (
    <div className={`nuxy-slider ${disabled ? 'nuxy-slider--disabled' : ''} ${className || ''}`}>
      {showValue && <span className="nuxy-slider__value">{current}</span>}
      <div className="nuxy-slider__track-wrapper">
        <input
          id={id}
          type="range"
          className="nuxy-slider__input"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          onChange={handleChange}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
        />
      </div>
      {showLabels && (
        <div className="nuxy-slider__labels">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
