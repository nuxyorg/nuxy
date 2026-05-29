import React from 'react'
import ReactDOM from 'react-dom'

export interface PortalProps {
  children: React.ReactNode
  container?: HTMLElement
}

export function Portal({ children, container }: PortalProps) {
  const [mountNode, setMountNode] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    setMountNode(container ?? document.body)
  }, [container])

  if (!mountNode) return null

  return ReactDOM.createPortal(children, mountNode)
}
