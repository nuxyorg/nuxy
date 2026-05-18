import React from 'react'

export const Input = React.forwardRef((props: any, ref: any) => {
  return (
    <input
      ref={ref}
      className="flex h-9 w-full rounded-md border border-syntax-comment bg-transparent px-3 py-1 text-sm text-syntax-variable shadow-sm transition-colors placeholder:text-syntax-keyword/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-syntax-operator disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  )
})
Input.displayName = 'Input'
