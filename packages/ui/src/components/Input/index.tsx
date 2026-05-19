import React from 'react'
import './index.css'

export const Input = React.forwardRef(({ className, ...props }: any, ref: any) => {
  return (
    <input
      ref={ref}
      className={`nuxy-input ${className || ''}`}
      {...props}
    />
  )
})
Input.displayName = 'Input'
