import React from 'react'
import { ProgressBar } from '../ProgressBar'
import './index.css'

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

function fmtDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return ''
  const hrs = Math.floor(sec / 3600)
  const mins = Math.floor((sec % 3600) / 60)
  const secs = Math.floor(sec % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
}: MediaPreviewProps) {
  const formattedDuration = typeof duration === 'number' ? fmtDuration(duration) : duration

  const classes = [
    'nuxy-media-preview',
    `nuxy-media-preview--${size}`,
    `nuxy-media-preview--${layout}`,
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {thumbnail && (
        <div className="nuxy-media-preview__thumbnail-container">
          <img src={thumbnail} className="nuxy-media-preview__thumbnail" alt="" />
          {formattedDuration && (
            <span className="nuxy-media-preview__duration">{formattedDuration}</span>
          )}
        </div>
      )}
      <div className="nuxy-media-preview__content">
        <span className="nuxy-media-preview__title">{title}</span>
        {(uploader || badge) && (
          <div className="nuxy-media-preview__meta-row">
            {uploader && <span className="nuxy-media-preview__uploader">{uploader}</span>}
            {badge && <span className="nuxy-media-preview__badge">{badge}</span>}
          </div>
        )}
        {typeof progress === 'number' && (
          <div className="nuxy-media-preview__progress">
            <ProgressBar value={progress} max={100} size="sm" />
          </div>
        )}
        {footerText && <span className="nuxy-media-preview__footer-text">{footerText}</span>}
        {children}
      </div>
    </div>
  )
}
