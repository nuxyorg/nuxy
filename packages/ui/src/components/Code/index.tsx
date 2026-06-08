
export interface CodeProps extends Record<string, unknown> {}

export interface CodeBlockProps {
  code: string
  language?: string
  showCopy?: boolean
  className?: string
}

export function Code(...args: any[]): unknown {
  return (window.UI as any)?.Code?.(...args) ?? null
}

export function CodeBlock(...args: any[]): unknown {
  return (window.UI as any)?.CodeBlock?.(...args) ?? null
}
