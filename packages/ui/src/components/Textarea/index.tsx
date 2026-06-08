
export interface TextareaProps extends Record<string, unknown> {}

export function Textarea(...args: any[]): unknown {
  return (window.UI as any)?.Textarea?.(...args) ?? null
}
