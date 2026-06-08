import { h } from '../../h'
import './nuxy-markdown-text.ts'

export interface MarkdownTextProps {
  children: string
  className?: string
}

export function MarkdownText({ children, className }: MarkdownTextProps) {
  return h('nuxy-markdown-text', { content: children, class: className })
}
