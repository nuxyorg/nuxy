export interface CodeProps extends Record<string, unknown> {}
export interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}
