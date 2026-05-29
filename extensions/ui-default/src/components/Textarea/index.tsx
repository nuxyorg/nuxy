import React from 'react'
import './index.css'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={`nuxy-textarea ${className || ''}`} {...props} />
  )
)
Textarea.displayName = 'Textarea'
