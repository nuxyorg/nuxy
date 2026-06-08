import { h } from '../../h'
import './nuxy-copy-button.ts'

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
  return h('nuxy-copy-button', {
    class: className,
    value,
    label,
    'copied-label': copiedLabel,
    timeout: String(timeout),
  })
}
