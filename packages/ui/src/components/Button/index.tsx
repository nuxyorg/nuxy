import React from 'react'

export function Button({ children, className, variant, ...props }: any) {
  const baseStyle = "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
  let variantStyle = "bg-syntax-comment border-syntax-comment text-syntax-variable hover:bg-syntax-keyword hover:border-syntax-keyword"
  if (variant === 'danger') {
    variantStyle = "bg-syntax-invalid bg-opacity-20 border-syntax-invalid border-opacity-40 text-syntax-invalid hover:bg-opacity-30"
  } else if (variant === 'success') {
    variantStyle = "bg-syntax-function bg-opacity-20 border-syntax-function border-opacity-40 text-syntax-function hover:bg-opacity-30"
  } else if (variant === 'primary') {
    variantStyle = "bg-syntax-operator bg-opacity-20 border-syntax-operator border-opacity-40 text-syntax-operator hover:bg-opacity-30"
  }
  return (
    <button
      className={`${baseStyle} ${variantStyle} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
