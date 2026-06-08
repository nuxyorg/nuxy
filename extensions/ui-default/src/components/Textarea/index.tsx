import { h } from '../../h'
import { host, wireInputRef } from '../../host'
import './nuxy-textarea.ts'

export interface TextareaProps extends Record<string, unknown> {
  className?: string
  value?: string
  defaultValue?: string
}

export function Textarea({
  className,
  value,
  defaultValue,
  ref,
  ...props
}: TextareaProps & { ref?: unknown }): HTMLElement {
  const el = h('nuxy-textarea', {
    ...props,
    class: className,
    ...(value !== undefined ? { value } : {}),
    ...(defaultValue !== undefined ? { value: defaultValue } : {}),
  })
  if (ref) wireInputRef(el, ref)
  return el
}
