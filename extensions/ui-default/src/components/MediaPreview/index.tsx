import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-media-preview.ts'

export interface MediaPreviewProps extends Record<string, unknown> {
  thumbnail?: string | null
  title: string
  uploader?: string | null
  duration?: number | string | null
  progress?: number | null
  footerText?: string | null
  badge?: UiChild
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
}

export function MediaPreview({
  thumbnail,
  title,
  uploader,
  duration,
  progress,
  footerText,
  badge,
  size = 'md',
  layout = 'horizontal',
  className,
  children,
  ...props
}: MediaPreviewProps): HTMLElement {
  const durationAttr =
    duration === null || duration === undefined
      ? undefined
      : typeof duration === 'number'
        ? String(duration)
        : duration

  return h(
    'nuxy-media-preview',
    {
      ...props,
      class: className,
      title,
      size,
      layout,
      ...(thumbnail ? { thumbnail } : {}),
      ...(uploader ? { uploader } : {}),
      ...(durationAttr ? { duration: durationAttr } : {}),
      ...(typeof progress === 'number' ? { progress: String(progress) } : {}),
      ...(footerText ? { 'footer-text': footerText } : {}),
    },
    badge != null && badge !== false ? h('span', { 'data-badge': '' }, badge) : null,
    children
  )
}
