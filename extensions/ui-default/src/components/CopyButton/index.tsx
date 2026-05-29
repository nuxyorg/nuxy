import React from 'react'
import './index.css'

export interface CopyButtonProps {
  value: string
  label?: string
  copiedLabel?: string
  timeout?: number
  className?: string
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied!',
  timeout = 1500,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), timeout)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), timeout)
    }
  }

  return (
    <button
      type="button"
      className={`nuxy-copy-button ${copied ? 'nuxy-copy-button--copied' : ''} ${className || ''}`}
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied ? copiedLabel : label}
    </button>
  )
}
