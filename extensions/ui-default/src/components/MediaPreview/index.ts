export interface MediaPreviewProps extends Record<string, unknown> {
  thumbnail?: string | null
  title: string
  uploader?: string | null
  duration?: number | string | null
  progress?: number | null
  footerText?: string | null
  badge?: unknown
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
}
