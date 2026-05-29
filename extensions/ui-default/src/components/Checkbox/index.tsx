import React from 'react'
import './index.css'

export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: React.ReactNode
  id?: string
  className?: string
}

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled,
  label,
  id,
  className,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : internalChecked

  const handleChange = () => {
    if (disabled) return
    if (!isControlled) setInternalChecked((prev) => !prev)
    onChange?.(!isChecked)
  }

  return (
    <label
      className={`nuxy-checkbox ${isChecked ? 'nuxy-checkbox--checked' : ''} ${disabled ? 'nuxy-checkbox--disabled' : ''} ${className || ''}`}
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        className="nuxy-checkbox__input"
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        aria-checked={isChecked}
      />
      <span className="nuxy-checkbox__box" onClick={handleChange} aria-hidden="true">
        <svg className="nuxy-checkbox__checkmark" viewBox="0 0 12 9">
          <polyline points="1,5 4,8 11,1" />
        </svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}
