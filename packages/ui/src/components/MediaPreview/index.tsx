import React from 'react'

export interface MediaPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  thumbnail?: string | null
  title: string
  uploader?: string | null
  duration?: number | string | null
  progress?: number | null
  footerText?: string | null
  badge?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
}

export function MediaPreview(props: MediaPreviewProps): React.ReactElement {
  const Impl = (window.UI as any)?.MediaPreview || (() => null)
  return <Impl {...props} />
}
