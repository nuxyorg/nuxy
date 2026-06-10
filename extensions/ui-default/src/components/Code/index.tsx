import { h } from '../../h'
import './nuxy-code.ts'
import './nuxy-code-block.ts'

export interface CodeProps extends Record<string, unknown> {}

export function Code({ children, className, ...props }: CodeProps) {
  return h('nuxy-code', { ...props, class: className }, children)
}

export interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}

export function CodeBlock({ code, language = 'text', showCopy = true, className }: CodeBlockProps) {
  return h('nuxy-code-block', {
    code,
    language,
    class: className,
    ...(showCopy ? {} : { 'show-copy': 'false' }),
  })
}
