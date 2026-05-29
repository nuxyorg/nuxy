import React from 'react'



export interface TwoPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  left: React.ReactNode
  right: React.ReactNode
  split?: string
}

export function TwoPanel(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.TwoPanel || (() => null);
  return <Impl {...props} />;
}

