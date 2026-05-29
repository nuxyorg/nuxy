import React from 'react'



export interface CircularProgressProps {
  value?: number // 0-100, omit for indeterminate spinner
  size?: number // size in px
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}



/* ErrorState */
export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}



/* Banner */
export interface BannerProps {
  variant?: 'info' | 'warning' | 'error' | 'success'
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function CircularProgress(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.CircularProgress || (() => null);
  return <Impl {...props} />;
}

export function ErrorState(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.ErrorState || (() => null);
  return <Impl {...props} />;
}

export function Banner(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Banner || (() => null);
  return <Impl {...props} />;
}

