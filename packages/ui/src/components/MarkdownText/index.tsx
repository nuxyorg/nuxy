
export interface MarkdownTextProps {
  children: string
  className?: string
}

export function MarkdownText(...args: any[]): unknown {
  return (window.UI as any)?.MarkdownText?.(...args) ?? null
}
