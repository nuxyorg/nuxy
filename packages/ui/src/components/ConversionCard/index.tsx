
export interface ConversionCardProps {
  from: unknown
  to: unknown
  label?: string
}

export function ConversionCard(...args: any[]): unknown {
  return (window.UI as any)?.ConversionCard?.(...args) ?? null
}
