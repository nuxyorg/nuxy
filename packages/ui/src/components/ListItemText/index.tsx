import React from 'react'

const variantStyles: Record<string, string> = {
  default: 'text-syntax-variable',
  success: 'text-syntax-function'
}

export function ListItemText({ children, variant = 'default', className, ...props }: any) {
  return (
    <span
      className={`text-sm font-mono truncate transition-colors duration-150 ${variantStyles[variant] || variantStyles.default} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  )
}
