import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Card || (() => null)
  return <Impl {...props} />
}

export function CardHeader(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CardHeader || (() => null)
  return <Impl {...props} />
}

export function CardBody(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CardBody || (() => null)
  return <Impl {...props} />
}

export function CardFooter(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CardFooter || (() => null)
  return <Impl {...props} />
}
