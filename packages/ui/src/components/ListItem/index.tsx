import React, { useRef, useEffect } from 'react'

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  className?: string
}

export function ListItem(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ListItem || (() => null)
  return <Impl {...props} />
}
