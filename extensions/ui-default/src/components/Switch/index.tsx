import React from 'react'
import './index.css'

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: React.ReactNode
  id?: string
  className?: string
}

export function Switch({ checked, defaultChecked, onChange, disabled, label, id, className }: SwitchProps) {
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
      className={`nuxy-switch ${isChecked ? 'nuxy-switch--checked' : ''} ${disabled ? 'nuxy-switch--disabled' : ''} ${className || ''}`}
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="nuxy-switch__input"
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        aria-checked={isChecked}
      />
      <span className="nuxy-switch__track" onClick={handleChange} aria-hidden="true">
        <span className="nuxy-switch__thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}
