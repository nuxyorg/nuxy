import React from 'react'
import './index.css'

export interface PinInputProps {
  length?: number
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  mask?: boolean
  className?: string
}

export function PinInput({
  length = 4,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  mask = false,
  className,
}: PinInputProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const currentVal = isControlled ? value : internalValue

  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value
    if (!val) return

    // Take the last character
    const char = val.slice(-1)
    const nextVal = currentVal.split('')
    nextVal[idx] = char
    const finalVal = nextVal.join('').slice(0, length)

    if (!isControlled) setInternalValue(finalVal)
    onChange?.(finalVal)

    if (finalVal.length === length) {
      onComplete?.(finalVal)
    }

    // Auto focus next
    if (idx < length - 1 && char) {
      inputsRef.current[idx + 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      const nextVal = currentVal.split('')
      if (!nextVal[idx] && idx > 0) {
        // focus previous and clear it
        inputsRef.current[idx - 1]?.focus()
        nextVal[idx - 1] = ''
      } else {
        nextVal[idx] = ''
      }
      const finalVal = nextVal.join('')
      if (!isControlled) setInternalValue(finalVal)
      onChange?.(finalVal)
      e.preventDefault()
    }
  }

  return (
    <div className={`nuxy-pin-input ${className || ''}`}>
      {Array.from({ length }).map((_, idx) => {
        const val = currentVal[idx] || ''
        return (
          <React.Fragment key={idx}>
            <input
              ref={(el) => {
                inputsRef.current[idx] = el
              }}
              type={mask ? 'password' : 'text'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={val}
              disabled={disabled}
              onChange={(e) => handleChange(e, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={[
                'nuxy-pin-input__cell',
                val ? 'nuxy-pin-input__cell--filled' : '',
                error ? 'nuxy-pin-input__cell--error' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`Digit ${idx + 1}`}
            />
            {idx === Math.floor(length / 2) - 1 && length > 4 && (
              <span className="nuxy-pin-input__sep" aria-hidden="true">
                −
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
