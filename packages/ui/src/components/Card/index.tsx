
export interface CardProps extends Record<string, unknown> {
  interactive?: boolean
}

export interface CardHeaderProps extends Record<string, unknown> {}

export interface CardBodyProps extends Record<string, unknown> {}

export interface CardFooterProps extends Record<string, unknown> {}

export function Card(...args: any[]): unknown {
  return (window.UI as any)?.Card?.(...args) ?? null
}

export function CardHeader(...args: any[]): unknown {
  return (window.UI as any)?.CardHeader?.(...args) ?? null
}

export function CardBody(...args: any[]): unknown {
  return (window.UI as any)?.CardBody?.(...args) ?? null
}

export function CardFooter(...args: any[]): unknown {
  return (window.UI as any)?.CardFooter?.(...args) ?? null
}
