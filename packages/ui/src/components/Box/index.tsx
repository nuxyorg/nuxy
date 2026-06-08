
export interface BoxProps extends Record<string, unknown> {
  as?: unknown
  display?: unknown['display']
  padding?: number | string
  margin?: number | string
  gap?: number | string
  flex?: unknown['flex']
}

export function Box(...args: any[]): unknown {
  return (window.UI as any)?.Box?.(...args) ?? null
}
