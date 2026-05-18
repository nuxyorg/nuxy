import React from 'react'

export const Input = React.forwardRef((props: any, ref: any) => {
  return (
    <input
      ref={ref}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  )
})
Input.displayName = 'Input'
